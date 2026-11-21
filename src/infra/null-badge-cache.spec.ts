import { describe, expect, it } from "bun:test"

import { BadgeService } from "../badge/badge.service.js"
import { NullBadgeCache } from "./null-badge-cache.js"

describe("NullBadgeCache", () => {
	it("never returns what was stored", () => {
		const cache = new NullBadgeCache()
		cache.set("a", "<svg/>")
		expect(cache.get("a")).toBeUndefined()
	})

	it("still lets BadgeService render", () => {
		const service = new BadgeService(new NullBadgeCache())
		expect(service.render({ value: "ok" })).toStartWith("<svg")
	})
})
