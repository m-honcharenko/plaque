import { describe, expect, it } from "bun:test"

import { etagOf, matchesEtag } from "./etag.js"

describe("etagOf", () => {
	it("is a quoted strong validator", () => {
		expect(etagOf("<svg/>")).toMatch(/^"[A-Za-z0-9_-]{27}"$/)
	})

	it("is stable and tells bodies apart", () => {
		expect(etagOf("<svg a/>")).toBe(etagOf("<svg a/>"))
		expect(etagOf("<svg a/>")).not.toBe(etagOf("<svg b/>"))
	})
})

describe("matchesEtag", () => {
	const etag = etagOf("<svg/>")
	const other = etagOf("<svg other/>")

	it("matches the same tag", () => {
		expect(matchesEtag(etag, etag)).toBe(true)
	})

	it("ignores the weak prefix", () => {
		expect(matchesEtag(`W/${etag}`, etag)).toBe(true)
	})

	it("matches one tag in a list", () => {
		expect(matchesEtag(`${other}, W/${etag} ,"x"`, etag)).toBe(true)
	})

	it("matches *", () => {
		expect(matchesEtag("*", etag)).toBe(true)
		expect(matchesEtag(" * ", etag)).toBe(true)
	})

	it.each([undefined, "", "   ", "garbage", etag.slice(1, -1), "W/"])(
		"does not match %p",
		(header) => {
			expect(matchesEtag(header, etag)).toBe(false)
		}
	)

	it("does not match another tag", () => {
		expect(matchesEtag(other, etag)).toBe(false)
	})
})
