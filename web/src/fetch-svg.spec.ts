import { describe, expect, it } from "bun:test"

import { toFileUrl } from "./fetch-svg.js"

describe("toFileUrl", () => {
	it("keeps an ordinary http(s) link", () => {
		expect(toFileUrl("https://cdn.example/icons/a.svg")).toBe(
			"https://cdn.example/icons/a.svg"
		)
		expect(toFileUrl("  http://localhost:8080/a.svg ")).toBe(
			"http://localhost:8080/a.svg"
		)
	})

	it("turns a GitHub file page into the raw file", () => {
		expect(
			toFileUrl("https://github.com/primer/octicons/blob/main/icons/x-24.svg")
		).toBe(
			"https://raw.githubusercontent.com/primer/octicons/main/icons/x-24.svg"
		)
	})

	it("leaves other GitHub pages alone", () => {
		expect(toFileUrl("https://github.com/primer/octicons")).toBe(
			"https://github.com/primer/octicons"
		)
	})

	it.each([
		"",
		"not a url",
		"ftp://host/a.svg",
		"javascript:alert(1)",
		"data:image/svg+xml,<svg/>",
		"file:///etc/passwd"
	])("refuses %j", (raw) => {
		expect(toFileUrl(raw)).toBeNull()
	})
})
