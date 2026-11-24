import { describe, expect, it } from "bun:test"

import {
	ValueError,
	type ProvidedValue,
	type ValueProvider,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import { LruBadgeCache } from "../infra/lru-badge-cache.js"
import { BadgeService } from "./badge.service.js"
import { DYNAMIC_CACHE, DynamicBadgeService } from "./dynamic-badge.service.js"

const STARS: ValueQuery = {
	source: "github",
	metric: "stars",
	owner: "o",
	repo: "r"
}
const VALUE: ProvidedValue = {
	label: "stars",
	value: "12k",
	color: "info",
	icon: "star"
}

function serviceAnswering(answer: ProvidedValue | Error) {
	const provider: ValueProvider = {
		async fetch() {
			if (answer instanceof Error) throw answer
			return answer
		}
	}
	return new DynamicBadgeService(
		provider,
		new BadgeService(new LruBadgeCache(10))
	)
}

describe("DynamicBadgeService", () => {
	it("renders the value with the defaults of the provider", async () => {
		const { svg, cacheControl } = await serviceAnswering(VALUE).render(
			STARS,
			{}
		)
		expect(svg).toContain("stars: 12k")
		expect(cacheControl).toBe(DYNAMIC_CACHE.value)
	})

	it("lets the options of the caller win", async () => {
		const { svg } = await serviceAnswering(VALUE).render(STARS, {
			label: "Our stars",
			color: "ff0000"
		})
		expect(svg).toContain("Our stars: 12k")
		expect(svg).toContain("#ff0000")
		expect(svg).not.toContain("<title>stars: 12k</title>")
	})

	it("turns not_found into a badge", async () => {
		const { svg, cacheControl } = await serviceAnswering(
			new ValueError("not_found")
		).render(STARS, {})
		expect(svg).toContain("stars: not found")
		expect(cacheControl).toBe(DYNAMIC_CACHE.notFound)
	})

	it("turns unavailable into a badge with a short cache time", async () => {
		const { svg, cacheControl } = await serviceAnswering(
			new ValueError("unavailable")
		).render(STARS, {})
		expect(svg).toContain("stars: unavailable")
		expect(cacheControl).toBe(DYNAMIC_CACHE.unavailable)
	})

	it("does not hide a bug behind a badge", async () => {
		const service = serviceAnswering(new TypeError("bug"))
		const error = await service.render(STARS, {}).then(
			() => undefined,
			(caught: unknown) => caught
		)
		expect(error).toBeInstanceOf(TypeError)
	})
})
