import { describe, expect, it } from "bun:test"

import {
	MAX_QUERY_PARAMS,
	MAX_URL_LENGTH,
	checkRequestLimits
} from "./request-limits.js"

function urlOfLength(length: number): string {
	const base = "/badge?value=ok&pad="
	return base + "x".repeat(length - base.length)
}

function urlWithParams(count: number): string {
	return `/badge?${Array.from({ length: count }, (_, i) => `p${i}=1`).join("&")}`
}

describe("checkRequestLimits", () => {
	it("accepts an ordinary badge url", () => {
		expect(
			checkRequestLimits("/badge?label=build&value=passing&icon=workflow")
		).toBeNull()
		expect(checkRequestLimits("/health")).toBeNull()
		expect(checkRequestLimits("/badge")).toBeNull()
		expect(checkRequestLimits("/badge?")).toBeNull()
	})

	it("accepts a url of exactly the maximum length", () => {
		expect(checkRequestLimits(urlOfLength(MAX_URL_LENGTH))).toBeNull()
	})

	it("rejects a longer url with 414", () => {
		expect(checkRequestLimits(urlOfLength(MAX_URL_LENGTH + 1))?.status).toBe(
			414
		)
		expect(checkRequestLimits(urlOfLength(100_000))?.status).toBe(414)
	})

	it("accepts exactly the maximum number of params", () => {
		expect(checkRequestLimits(urlWithParams(MAX_QUERY_PARAMS))).toBeNull()
	})

	it("rejects more params with 400", () => {
		expect(
			checkRequestLimits(urlWithParams(MAX_QUERY_PARAMS + 1))?.status
		).toBe(400)
		// Short enough to pass the length limit, so only the count rejects it.
		expect(checkRequestLimits(`/badge?${"a&".repeat(1000)}`)?.status).toBe(400)
	})

	it("does not count empty segments", () => {
		expect(checkRequestLimits(`/badge?value=ok${"&".repeat(500)}`)).toBeNull()
	})

	it("counts a param with no value and a repeated name", () => {
		const flags = `/badge?${"a&".repeat(MAX_QUERY_PARAMS + 1)}`
		expect(checkRequestLimits(flags)?.status).toBe(400)
		const repeated = `/badge?${"value=1&".repeat(MAX_QUERY_PARAMS + 1)}`
		expect(checkRequestLimits(repeated)?.status).toBe(400)
	})

	it("checks the length before the params", () => {
		const url = `${urlWithParams(MAX_QUERY_PARAMS + 5)}&pad=${"x".repeat(MAX_URL_LENGTH)}`
		expect(checkRequestLimits(url)?.status).toBe(414)
	})
})
