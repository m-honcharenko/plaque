import { describe, expect, it } from "bun:test"

import { LruBadgeCache } from "../infra/lru-badge-cache.js"
import { BadgeService } from "./badge.service.js"

function setup() {
	const cache = new LruBadgeCache(10)
	return { cache, service: new BadgeService(cache) }
}

describe("BadgeService", () => {
	it("renders an svg", () => {
		const { service } = setup()
		expect(service.render({ label: "build", value: "passing" })).toStartWith(
			"<svg"
		)
	})

	it("serves a repeated badge from the cache", () => {
		const { cache, service } = setup()
		const first = service.render({ label: "build", value: "passing" })
		expect(cache.size).toBe(1)
		expect(service.render({ label: "build", value: "passing" })).toBe(first)
		expect(cache.size).toBe(1)
	})

	it("shares one entry between inputs with the same canonical config", () => {
		const { cache, service } = setup()
		service.render({ label: "build", value: "passing", color: "2DA44E" })
		service.render({
			label: "  build ",
			value: "passing",
			color: "2da44e",
			theme: "auto",
			layout: "full"
		})
		expect(cache.size).toBe(1)
	})

	it("keeps separate entries for different layouts, themes and colors", () => {
		const { cache, service } = setup()
		const base = { label: "build", value: "passing" }
		service.render(base)
		service.render({ ...base, layout: "compact" })
		service.render({ ...base, theme: "dark" })
		service.render({ ...base, color: "error" })
		expect(cache.size).toBe(4)
	})

	it("does not cache a render that failed", () => {
		const { cache, service } = setup()
		expect(() => service.render({ value: "ok", color: "banana" })).toThrow(
			RangeError
		)
		expect(cache.size).toBe(0)
	})
})
