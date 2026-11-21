import { describe, expect, it } from "bun:test"

import { LruBadgeCache } from "./lru-badge-cache.js"

describe("LruBadgeCache", () => {
	it("returns undefined for a missing key", () => {
		expect(new LruBadgeCache(2).get("a")).toBeUndefined()
	})

	it("returns what was stored", () => {
		const cache = new LruBadgeCache(2)
		cache.set("a", "<svg a/>")
		expect(cache.get("a")).toBe("<svg a/>")
	})

	it("evicts the least recently used entry when full", () => {
		const cache = new LruBadgeCache(2)
		cache.set("a", "1")
		cache.set("b", "2")
		cache.set("c", "3")
		expect(cache.get("a")).toBeUndefined()
		expect(cache.get("b")).toBe("2")
		expect(cache.get("c")).toBe("3")
	})

	it("counts a read as a use", () => {
		const cache = new LruBadgeCache(2)
		cache.set("a", "1")
		cache.set("b", "2")
		cache.get("a")
		cache.set("c", "3")
		expect(cache.get("a")).toBe("1")
		expect(cache.get("b")).toBeUndefined()
	})

	it("replaces a value without growing and counts it as a use", () => {
		const cache = new LruBadgeCache(2)
		cache.set("a", "1")
		cache.set("b", "2")
		cache.set("a", "1b")
		expect(cache.size).toBe(2)
		cache.set("c", "3")
		expect(cache.get("a")).toBe("1b")
		expect(cache.get("b")).toBeUndefined()
	})

	it("never holds more than its size", () => {
		const cache = new LruBadgeCache(5)
		for (let i = 0; i < 100; i++) cache.set(`k${i}`, "x")
		expect(cache.size).toBe(5)
		expect(cache.get("k99")).toBe("x")
		expect(cache.get("k94")).toBeUndefined()
	})

	it("works with a size of one", () => {
		const cache = new LruBadgeCache(1)
		cache.set("a", "1")
		cache.set("b", "2")
		expect(cache.get("a")).toBeUndefined()
		expect(cache.get("b")).toBe("2")
	})

	it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		"rejects the size %p",
		(size) => {
			expect(() => new LruBadgeCache(size)).toThrow(RangeError)
		}
	)
})
