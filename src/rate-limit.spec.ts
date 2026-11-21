import { describe, expect, it } from "bun:test"

import { RATE_LIMIT_DEFAULTS, rateLimitFromEnv } from "./rate-limit.js"

describe("rateLimitFromEnv", () => {
	it("uses the defaults when nothing is set", () => {
		expect(rateLimitFromEnv({})).toEqual({
			limit: RATE_LIMIT_DEFAULTS.limit,
			windowMs: RATE_LIMIT_DEFAULTS.windowMs
		})
		expect(rateLimitFromEnv({ RATE_LIMIT_MAX: "" })).toEqual({
			limit: RATE_LIMIT_DEFAULTS.limit,
			windowMs: RATE_LIMIT_DEFAULTS.windowMs
		})
	})

	it("reads both values", () => {
		expect(
			rateLimitFromEnv({ RATE_LIMIT_MAX: "10", RATE_LIMIT_WINDOW_MS: "5000" })
		).toEqual({ limit: 10, windowMs: 5000 })
	})

	it.each(["0", "-1", "1.5", "abc", "10 requests", "1e3x"])(
		"rejects %p",
		(value) => {
			expect(() => rateLimitFromEnv({ RATE_LIMIT_MAX: value })).toThrow(
				RangeError
			)
			expect(() => rateLimitFromEnv({ RATE_LIMIT_WINDOW_MS: value })).toThrow(
				RangeError
			)
		}
	)
})
