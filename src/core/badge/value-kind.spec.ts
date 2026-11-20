import { describe, expect, it } from "bun:test"

import { isIconName } from "../icons/icons.js"
import {
	narrowLayout,
	STATUS_ICONS,
	STATUS_WORDS,
	statusOf,
	type StatusKind
} from "./value-kind.js"

const KINDS = Object.keys(STATUS_WORDS) as StatusKind[]

describe("core/badge/value-kind", () => {
	it("recognizes a status word", () => {
		expect(statusOf("passing")).toBe("success")
		expect(statusOf("failing")).toBe("failure")
		expect(statusOf("degraded")).toBe("warning")
		expect(statusOf("in progress")).toBe("running")
	})

	it("ignores case and surrounding or repeated whitespace", () => {
		expect(statusOf("  Passing ")).toBe("success")
		expect(statusOf("IN   PROGRESS")).toBe("running")
	})

	it("treats everything else as data", () => {
		for (const value of ["v2.4.1", "100%", "1.2k", "stable", "beta", ""]) {
			expect(statusOf(value)).toBeNull()
		}
	})

	it("matches whole values only", () => {
		expect(statusOf("passing 12/12")).toBeNull()
		expect(statusOf("not ok")).toBeNull()
		expect(statusOf("pass!")).toBeNull()
	})

	it("is not confused by names from Object.prototype", () => {
		for (const value of ["constructor", "__proto__", "toString"]) {
			expect(statusOf(value)).toBeNull()
		}
	})

	it("lists every word under one kind only", () => {
		const words = KINDS.flatMap((kind) => STATUS_WORDS[kind])
		expect(new Set(words).size).toBe(words.length)
		for (const word of words) {
			expect(word).toBe(word.toLowerCase())
			expect(word).toBe(word.trim())
		}
	})

	it("maps every status kind to an icon from the whitelist", () => {
		for (const kind of KINDS) {
			expect(isIconName(STATUS_ICONS[kind])).toBe(true)
		}
	})

	it("picks compact for a status and vertical for data", () => {
		expect(narrowLayout("passing")).toBe("compact")
		expect(narrowLayout("v2.4.1")).toBe("vertical")
	})
})
