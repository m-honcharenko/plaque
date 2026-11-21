import { describe, expect, it } from "bun:test"

import { RateLimiter } from "./rate-limiter.js"

function setup(options: {
	limit?: number
	windowMs?: number
	maxKeys?: number
}) {
	let time = 1_000_000
	const limiter = new RateLimiter({
		limit: options.limit ?? 3,
		windowMs: options.windowMs ?? 60_000,
		maxKeys: options.maxKeys,
		now: () => time
	})
	return {
		limiter,
		advance: (ms: number) => {
			time += ms
		}
	}
}

describe("RateLimiter", () => {
	it("allows requests up to the limit and blocks the next one", () => {
		const { limiter } = setup({ limit: 3 })
		for (let i = 0; i < 3; i++) {
			expect(limiter.hit("a")).toEqual({ allowed: true })
		}
		expect(limiter.hit("a").allowed).toBe(false)
		expect(limiter.hit("a").allowed).toBe(false)
	})

	it("counts each key separately", () => {
		const { limiter } = setup({ limit: 1 })
		expect(limiter.hit("a").allowed).toBe(true)
		expect(limiter.hit("a").allowed).toBe(false)
		expect(limiter.hit("b").allowed).toBe(true)
	})

	it("says when to come back, in whole seconds, at least 1", () => {
		const { limiter, advance } = setup({ limit: 1, windowMs: 60_000 })
		limiter.hit("a")
		expect(limiter.hit("a")).toEqual({ allowed: false, retryAfterSeconds: 60 })
		advance(1_500)
		expect(limiter.hit("a")).toEqual({ allowed: false, retryAfterSeconds: 59 })
		advance(58_400)
		expect(limiter.hit("a")).toEqual({ allowed: false, retryAfterSeconds: 1 })
	})

	it("lets the client back in exactly when the window ends", () => {
		const { limiter, advance } = setup({ limit: 1, windowMs: 1_000 })
		limiter.hit("a")
		advance(999)
		expect(limiter.hit("a").allowed).toBe(false)
		advance(1)
		expect(limiter.hit("a").allowed).toBe(true)
		expect(limiter.hit("a").allowed).toBe(false)
	})

	it("does not push the window back for blocked requests", () => {
		const { limiter, advance } = setup({ limit: 1, windowMs: 1_000 })
		limiter.hit("a")
		for (let i = 0; i < 5; i++) {
			advance(150)
			limiter.hit("a")
		}
		advance(300)
		expect(limiter.hit("a").allowed).toBe(true)
	})

	it("drops expired windows first when the table is full", () => {
		const { limiter, advance } = setup({ maxKeys: 3, windowMs: 1_000 })
		for (const key of ["a", "b", "c"]) limiter.hit(key)
		advance(1_000)
		limiter.hit("d")
		expect(limiter.size).toBe(1)
	})

	it("keeps live windows and drops the oldest when all are live", () => {
		const { limiter, advance } = setup({ maxKeys: 2, limit: 1 })
		limiter.hit("a")
		advance(10)
		limiter.hit("b")
		advance(10)
		limiter.hit("c")
		expect(limiter.size).toBe(2)
		// "a" was dropped, so it starts a fresh window; "b" and "c" are kept.
		expect(limiter.hit("b").allowed).toBe(false)
		expect(limiter.hit("c").allowed).toBe(false)
	})

	it("stays bounded under many different clients", () => {
		const { limiter } = setup({ maxKeys: 100 })
		for (let i = 0; i < 10_000; i++) limiter.hit(`10.0.${i >> 8}.${i & 255}`)
		expect(limiter.size).toBeLessThanOrEqual(100)
	})

	it.each([
		{ limit: 0, windowMs: 1000 },
		{ limit: 1.5, windowMs: 1000 },
		{ limit: 1, windowMs: 0 },
		{ limit: 1, windowMs: -5 },
		{ limit: 1, windowMs: 1000, maxKeys: 0 },
		{ limit: Number.NaN, windowMs: 1000 }
	])("rejects the options %j", (options) => {
		expect(() => new RateLimiter(options)).toThrow(RangeError)
	})
})
