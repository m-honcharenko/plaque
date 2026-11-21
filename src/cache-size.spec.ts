import { describe, expect, it } from "bun:test"

import { DEFAULT_CACHE_SIZE, cacheSizeFromEnv } from "./cache-size.js"

describe("cacheSizeFromEnv", () => {
	it("uses the default when nothing is set", () => {
		expect(cacheSizeFromEnv({})).toBe(DEFAULT_CACHE_SIZE)
		expect(cacheSizeFromEnv({ BADGE_CACHE_SIZE: "" })).toBe(DEFAULT_CACHE_SIZE)
	})

	it("reads a size, and 0 turns the cache off", () => {
		expect(cacheSizeFromEnv({ BADGE_CACHE_SIZE: "50" })).toBe(50)
		expect(cacheSizeFromEnv({ BADGE_CACHE_SIZE: "0" })).toBe(0)
	})

	it.each(["-1", "1.5", "abc", "10 badges"])("rejects %p", (value) => {
		expect(() => cacheSizeFromEnv({ BADGE_CACHE_SIZE: value })).toThrow(
			RangeError
		)
	})
})
