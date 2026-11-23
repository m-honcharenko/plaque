import { describe, expect, it } from "bun:test"

import { ValueError } from "../core/ports/value-provider.port.js"
import { fetchJson, RateLimited, type FetchLike } from "./fetch-json.js"

const URL_OK = new URL("https://registry.npmjs.org/react/latest")

type Call = { url: string; init: RequestInit }

// A fetch that answers from a list, one response per call, and remembers
// what it was asked.
function fakeFetch(...answers: Response[]): {
	fetch: FetchLike
	calls: Call[]
} {
	const calls: Call[] = []
	const fetch: FetchLike = async (url, init) => {
		calls.push({ url, init })
		const answer = answers[calls.length - 1]
		if (answer === undefined) throw new Error("no more answers")
		return answer
	}
	return { fetch, calls }
}

const json = (body: unknown, init: ResponseInit = {}) =>
	new Response(JSON.stringify(body), init)

async function failure(promise: Promise<unknown>): Promise<unknown> {
	return promise.then(
		() => undefined,
		(caught: unknown) => caught
	)
}

describe("fetchJson", () => {
	it("returns the parsed body and sends the headers", async () => {
		const { fetch, calls } = fakeFetch(json({ version: "1.0.0" }))
		expect(await fetchJson(URL_OK, { fetch })).toEqual({ version: "1.0.0" })
		const sent = new Headers(calls[0]?.init.headers)
		expect(sent.get("accept")).toBe("application/json")
		expect(sent.get("user-agent")).toBe("plaque")
		expect(calls[0]?.init.redirect).toBe("manual")
	})

	it("adds the caller's headers", async () => {
		const { fetch, calls } = fakeFetch(json({}))
		await fetchJson(URL_OK, { fetch, headers: { authorization: "token x" } })
		expect(new Headers(calls[0]?.init.headers).get("authorization")).toBe(
			"token x"
		)
	})

	it("refuses an address that is not allowed before any request", async () => {
		const { fetch, calls } = fakeFetch(json({}))
		const error = await failure(
			fetchJson(new URL("https://evil.example/x"), { fetch })
		)
		expect(error).toBeInstanceOf(RangeError)
		expect(calls).toHaveLength(0)
	})

	it("maps 404 to not_found", async () => {
		const { fetch } = fakeFetch(new Response("nope", { status: 404 }))
		const error = await failure(fetchJson(URL_OK, { fetch }))
		expect(error).toBeInstanceOf(ValueError)
		expect((error as ValueError).reason).toBe("not_found")
	})

	it.each([403, 429, 500, 502, 503])(
		"maps %i to unavailable",
		async (status) => {
			const { fetch } = fakeFetch(new Response("x", { status }))
			const error = await failure(fetchJson(URL_OK, { fetch }))
			expect((error as ValueError).reason).toBe("unavailable")
		}
	)

	it("maps a plain 403 to unavailable, not to a rate limit", async () => {
		const { fetch } = fakeFetch(new Response("blocked", { status: 403 }))
		const error = await failure(fetchJson(URL_OK, { fetch }))
		expect(error).toBeInstanceOf(ValueError)
		expect(error).not.toBeInstanceOf(RateLimited)
	})

	it("maps a network error to unavailable", async () => {
		const fetch: FetchLike = async () => {
			throw new TypeError("connection reset")
		}
		const error = await failure(fetchJson(URL_OK, { fetch }))
		expect((error as ValueError).reason).toBe("unavailable")
	})

	it("gives up after the timeout", async () => {
		const fetch: FetchLike = (_url, init) =>
			new Promise((_resolve, reject) => {
				init.signal?.addEventListener("abort", () =>
					reject(init.signal?.reason)
				)
			})
		const started = Date.now()
		const error = await failure(fetchJson(URL_OK, { fetch, timeoutMs: 30 }))
		expect((error as ValueError).reason).toBe("unavailable")
		expect(Date.now() - started).toBeLessThan(1000)
	})

	it("maps a body that is not JSON to unavailable", async () => {
		const { fetch } = fakeFetch(new Response("<html>"))
		const error = await failure(fetchJson(URL_OK, { fetch }))
		expect((error as ValueError).reason).toBe("unavailable")
	})
})

describe("fetchJson: size limit", () => {
	it("refuses a body over the limit, even without a length header", async () => {
		const chunk = new TextEncoder().encode(`"${"x".repeat(400)}`)
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				for (let i = 0; i < 10; i += 1) controller.enqueue(chunk)
				controller.close()
			}
		})
		const { fetch } = fakeFetch(new Response(body))
		const error = await failure(fetchJson(URL_OK, { fetch, maxBytes: 1000 }))
		expect((error as ValueError).reason).toBe("unavailable")
		expect((error as ValueError).message).toContain("too big")
	})

	it("refuses at once when the length header is over the limit", async () => {
		const { fetch } = fakeFetch(
			new Response("{}", { headers: { "content-length": "5000" } })
		)
		const error = await failure(fetchJson(URL_OK, { fetch, maxBytes: 1000 }))
		expect((error as ValueError).message).toContain("too big")
	})

	it("accepts a body exactly at the limit", async () => {
		const text = JSON.stringify({ a: "x".repeat(20) })
		const { fetch } = fakeFetch(new Response(text))
		const body = await fetchJson(URL_OK, { fetch, maxBytes: text.length })
		expect(body).toEqual({ a: "x".repeat(20) })
	})

	it("reads multi-byte text split across chunks", async () => {
		const bytes = new TextEncoder().encode(JSON.stringify({ name: "日本語" }))
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(bytes.slice(0, 12))
				controller.enqueue(bytes.slice(12))
				controller.close()
			}
		})
		const { fetch } = fakeFetch(new Response(body))
		expect(await fetchJson(URL_OK, { fetch })).toEqual({ name: "日本語" })
	})
})

describe("fetchJson: rate limits", () => {
	const GITHUB = new URL("https://api.github.com/repos/o/r")

	it("reads how long to wait from retry-after", async () => {
		const { fetch } = fakeFetch(
			new Response("slow down", {
				status: 429,
				headers: { "retry-after": "30" }
			})
		)
		const error = await failure(fetchJson(URL_OK, { fetch }))
		expect(error).toBeInstanceOf(RateLimited)
		expect(error).toBeInstanceOf(ValueError)
		expect((error as RateLimited).reason).toBe("unavailable")
		expect((error as RateLimited).retryAfterMs).toBe(30_000)
	})

	it("recognizes GitHub's used-up quota and waits until the reset", async () => {
		const reset = Math.floor(Date.now() / 1000) + 120
		const { fetch } = fakeFetch(
			new Response("{}", {
				status: 403,
				headers: {
					"x-ratelimit-remaining": "0",
					"x-ratelimit-reset": String(reset)
				}
			})
		)
		const error = await failure(fetchJson(GITHUB, { fetch }))
		expect(error).toBeInstanceOf(RateLimited)
		const wait = (error as RateLimited).retryAfterMs
		expect(wait).toBeGreaterThan(100_000)
		expect(wait).toBeLessThanOrEqual(120_000)
	})

	it("falls back to a minute when the answer gives no time", async () => {
		const { fetch } = fakeFetch(new Response("x", { status: 429 }))
		const error = await failure(fetchJson(URL_OK, { fetch }))
		expect((error as RateLimited).retryAfterMs).toBe(60_000)
	})

	it("does not call a 403 with quota left a rate limit", async () => {
		const { fetch } = fakeFetch(
			new Response("{}", {
				status: 403,
				headers: { "x-ratelimit-remaining": "42" }
			})
		)
		const error = await failure(fetchJson(GITHUB, { fetch }))
		expect(error).not.toBeInstanceOf(RateLimited)
	})
})

describe("fetchJson: redirects", () => {
	const redirect = (location: string, status = 301) =>
		new Response(null, { status, headers: { location } })

	it("keeps the authorization header on the same host", async () => {
		const { fetch, calls } = fakeFetch(redirect("/repositories/42"), json({}))
		const url = new URL("https://api.github.com/repos/o/r")
		await fetchJson(url, { fetch, headers: { authorization: "Bearer x" } })
		for (const call of calls) {
			expect(new Headers(call.init.headers).get("authorization")).toBe(
				"Bearer x"
			)
		}
	})

	it("leaves the authorization header out after a change of host", async () => {
		const { fetch, calls } = fakeFetch(
			redirect("https://registry.npmjs.org/x"),
			json({})
		)
		const url = new URL("https://api.github.com/repos/o/r")
		await fetchJson(url, {
			fetch,
			headers: { Authorization: "Bearer x", "x-other": "kept" }
		})
		expect(calls).toHaveLength(2)
		const first = new Headers(calls[0]?.init.headers)
		const second = new Headers(calls[1]?.init.headers)
		expect(first.get("authorization")).toBe("Bearer x")
		expect(second.get("authorization")).toBeNull()
		expect(second.get("x-other")).toBe("kept")
	})

	it("follows a redirect to another allowed address", async () => {
		const { fetch, calls } = fakeFetch(
			redirect("/repositories/42"),
			json({ stargazers_count: 7 })
		)
		const url = new URL("https://api.github.com/repos/o/r")
		expect(await fetchJson(url, { fetch })).toEqual({ stargazers_count: 7 })
		expect(calls.map((call) => call.url)).toEqual([
			"https://api.github.com/repos/o/r",
			"https://api.github.com/repositories/42"
		])
	})

	it.each([
		"https://evil.example/x",
		"http://api.github.com/x",
		"https://api.github.com@evil.example/x",
		"https://api.github.com:8443/x"
	])("refuses a redirect to %s", async (target) => {
		const { fetch, calls } = fakeFetch(redirect(target), json({}))
		const url = new URL("https://api.github.com/repos/o/r")
		const error = await failure(fetchJson(url, { fetch }))
		expect((error as ValueError).reason).toBe("unavailable")
		expect(calls).toHaveLength(1)
	})

	it("refuses a redirect without a location", async () => {
		const { fetch } = fakeFetch(new Response(null, { status: 302 }))
		const error = await failure(fetchJson(URL_OK, { fetch }))
		expect((error as ValueError).reason).toBe("unavailable")
	})

	it("stops after too many redirects", async () => {
		const { fetch, calls } = fakeFetch(
			redirect("/a"),
			redirect("/b"),
			redirect("/c"),
			redirect("/d"),
			redirect("/e")
		)
		const error = await failure(fetchJson(URL_OK, { fetch }))
		expect((error as ValueError).message).toContain("redirects")
		expect(calls).toHaveLength(4)
	})
})
