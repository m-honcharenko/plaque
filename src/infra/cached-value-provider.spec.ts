import { describe, expect, it } from "bun:test"

import {
	ValueError,
	type ProvidedValue,
	type ValueProvider,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import {
	CachedValueProvider,
	valueKey,
	type ValueCacheOptions
} from "./cached-value-provider.js"

const MINUTE = 60_000
const OPTIONS = {
	ttlMs: 10 * MINUTE,
	staleMs: 60 * MINUTE,
	notFoundMs: 5 * MINUTE,
	unavailableMs: 30_000,
	maxEntries: 1000
}

const value = (text: string): ProvidedValue => ({
	label: "npm",
	value: text,
	color: "info",
	icon: "npm"
})
const npm = (name: string): ValueQuery => ({
	source: "npm",
	metric: "version",
	name
})

// A provider whose next answers are set by the test; counts its calls.
class Scripted implements ValueProvider {
	calls = 0
	answers: (ProvidedValue | Error)[] = []
	gate: Promise<void> | null = null

	async fetch(): Promise<ProvidedValue> {
		this.calls += 1
		if (this.gate !== null) await this.gate
		const next =
			this.answers.length > 1 ? this.answers.shift() : this.answers[0]
		if (next === undefined) throw new Error("no answer set")
		if (next instanceof Error) throw next
		return next
	}
}

function setup(options: Partial<ValueCacheOptions> = {}) {
	const inner = new Scripted()
	const clock = { now: 1_000_000 }
	const cache = new CachedValueProvider(inner, {
		...OPTIONS,
		...options,
		now: () => clock.now
	})
	return { inner, clock, cache }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

async function failure(promise: Promise<unknown>): Promise<unknown> {
	return promise.then(
		() => undefined,
		(caught: unknown) => caught
	)
}

describe("valueKey", () => {
	it("is the same for GitHub names that differ in case only", () => {
		const a = valueKey({
			source: "github",
			metric: "stars",
			owner: "Foo",
			repo: "Bar"
		})
		const b = valueKey({
			source: "github",
			metric: "stars",
			owner: "foo",
			repo: "bar"
		})
		expect(a).toBe(b)
	})

	it("tells metrics and sources apart", () => {
		const keys = [
			valueKey({ source: "github", metric: "stars", owner: "o", repo: "r" }),
			valueKey({ source: "github", metric: "ci", owner: "o", repo: "r" }),
			valueKey(npm("o"))
		]
		expect(new Set(keys).size).toBe(3)
	})
})

describe("CachedValueProvider: fresh values", () => {
	it("asks upstream once while the value is fresh", async () => {
		const { inner, clock, cache } = setup()
		inner.answers = [value("v1")]
		expect(await cache.fetch(npm("a"))).toEqual(value("v1"))
		clock.now += 9 * MINUTE
		expect(await cache.fetch(npm("a"))).toEqual(value("v1"))
		expect(inner.calls).toBe(1)
	})

	it("keeps different packages apart", async () => {
		const { inner, cache } = setup()
		inner.answers = [value("v1")]
		await cache.fetch(npm("a"))
		await cache.fetch(npm("b"))
		expect(inner.calls).toBe(2)
	})

	it("shares one upstream call between simultaneous requests", async () => {
		const { inner, cache } = setup()
		inner.answers = [value("v1")]
		let open: () => void = () => undefined
		inner.gate = new Promise((resolve) => {
			open = resolve
		})
		const all = Promise.all([
			cache.fetch(npm("a")),
			cache.fetch(npm("a")),
			cache.fetch(npm("a"))
		])
		open()
		const results = await all
		expect(results.every((result) => result.value === "v1")).toBe(true)
		expect(inner.calls).toBe(1)
	})
})

describe("CachedValueProvider: stale-while-revalidate", () => {
	it("serves the old value at once and refreshes in the background", async () => {
		const { inner, clock, cache } = setup()
		inner.answers = [value("v1"), value("v2")]
		await cache.fetch(npm("a"))
		clock.now += 11 * MINUTE

		expect((await cache.fetch(npm("a"))).value).toBe("v1")
		await settle()
		expect(inner.calls).toBe(2)
		expect((await cache.fetch(npm("a"))).value).toBe("v2")
		expect(inner.calls).toBe(2)
	})

	it("starts only one refresh for many stale requests", async () => {
		const { inner, clock, cache } = setup()
		inner.answers = [value("v1"), value("v2")]
		await cache.fetch(npm("a"))
		clock.now += 11 * MINUTE
		await Promise.all([cache.fetch(npm("a")), cache.fetch(npm("a"))])
		await settle()
		expect(inner.calls).toBe(2)
	})

	it("keeps serving the old value when the refresh fails, and backs off", async () => {
		const { inner, clock, cache } = setup()
		inner.answers = [value("v1"), new ValueError("unavailable")]
		await cache.fetch(npm("a"))
		clock.now += 11 * MINUTE

		expect((await cache.fetch(npm("a"))).value).toBe("v1")
		await settle()
		expect(inner.calls).toBe(2)
		// Within the backoff no new attempt is made.
		clock.now += 10_000
		expect((await cache.fetch(npm("a"))).value).toBe("v1")
		await settle()
		expect(inner.calls).toBe(2)
		// After it, one more.
		clock.now += 30_000
		await cache.fetch(npm("a"))
		await settle()
		expect(inner.calls).toBe(3)
	})

	it("fetches again and waits once the stale window is over", async () => {
		const { inner, clock, cache } = setup()
		inner.answers = [value("v1"), value("v2")]
		await cache.fetch(npm("a"))
		clock.now += 71 * MINUTE
		expect((await cache.fetch(npm("a"))).value).toBe("v2")
		expect(inner.calls).toBe(2)
	})

	it("passes the failure on when nothing usable is left", async () => {
		const { inner, clock, cache } = setup()
		inner.answers = [value("v1"), new ValueError("unavailable", "down")]
		await cache.fetch(npm("a"))
		clock.now += 71 * MINUTE
		const error = await failure(cache.fetch(npm("a")))
		expect((error as ValueError).message).toBe("down")
	})
})

describe("CachedValueProvider: failures", () => {
	it("remembers a missing package for a while", async () => {
		const { inner, clock, cache } = setup()
		inner.answers = [new ValueError("not_found")]
		for (let i = 0; i < 3; i += 1) {
			const error = await failure(cache.fetch(npm("nope")))
			expect((error as ValueError).reason).toBe("not_found")
		}
		expect(inner.calls).toBe(1)
		clock.now += 5 * MINUTE
		await failure(cache.fetch(npm("nope")))
		expect(inner.calls).toBe(2)
	})

	it("remembers an unavailable upstream only briefly", async () => {
		const { inner, clock, cache } = setup()
		inner.answers = [new ValueError("unavailable"), value("v1")]
		const first = await failure(cache.fetch(npm("a")))
		expect((first as ValueError).reason).toBe("unavailable")
		await failure(cache.fetch(npm("a")))
		expect(inner.calls).toBe(1)
		clock.now += 30_000
		expect((await cache.fetch(npm("a"))).value).toBe("v1")
		expect(inner.calls).toBe(2)
	})

	it("turns an unexpected error into unavailable", async () => {
		const { inner, cache } = setup()
		inner.answers = [new TypeError("bug")]
		const error = await failure(cache.fetch(npm("a")))
		expect(error).toBeInstanceOf(ValueError)
		expect((error as ValueError).reason).toBe("unavailable")
	})
})

describe("CachedValueProvider: size", () => {
	it("drops the least recently used entry first", async () => {
		const { inner, cache } = setup({ maxEntries: 2 })
		inner.answers = [value("v")]
		await cache.fetch(npm("a"))
		await cache.fetch(npm("b"))
		await cache.fetch(npm("a")) // a is now newer than b
		await cache.fetch(npm("c")) // drops b
		expect(inner.calls).toBe(3)
		await cache.fetch(npm("a"))
		expect(inner.calls).toBe(3)
		await cache.fetch(npm("b"))
		expect(inner.calls).toBe(4)
	})

	it("never keeps more than maxEntries failures either", async () => {
		const { inner, cache } = setup({ maxEntries: 2 })
		inner.answers = [new ValueError("not_found")]
		for (const name of ["a", "b", "c", "d"]) {
			await failure(cache.fetch(npm(name)))
		}
		expect(inner.calls).toBe(4)
		await failure(cache.fetch(npm("a")))
		expect(inner.calls).toBe(5)
	})
})
