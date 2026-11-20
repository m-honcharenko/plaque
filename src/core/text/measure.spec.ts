import { describe, expect, it } from "bun:test"

import { measure } from "./measure.js"
import { FONT_METRICS } from "./metrics.data.js"

describe("measure", () => {
	it("is zero for an empty string", () => {
		expect(measure("", 13)).toBe(0)
	})

	it("uses the font table for known characters", () => {
		const units = FONT_METRICS.widths[400][97]!
		expect(measure("a", 1000, 400)).toBe(units)
	})

	it("is additive over characters", () => {
		const whole = measure("passing", 13, 600)
		const parts = Array.from("passing").reduce(
			(n, c) => n + measure(c, 13, 600),
			0
		)
		expect(whole).toBeCloseTo(parts, 9)
	})

	it("scales linearly with the font size", () => {
		expect(measure("build", 26, 400)).toBeCloseTo(
			2 * measure("build", 13, 400),
			9
		)
	})

	it("orders narrow and wide letters sensibly", () => {
		expect(measure("i", 13)).toBeLessThan(measure("n", 13))
		expect(measure("n", 13)).toBeLessThan(measure("m", 13))
		expect(measure("W", 13)).toBeGreaterThan(measure("i", 13))
	})

	it("makes bold at least as wide as regular", () => {
		for (const text of ["passing", "build", "v1.2.3", "Привіт"]) {
			expect(measure(text, 13, 600)).toBeGreaterThanOrEqual(
				measure(text, 13, 400)
			)
		}
	})

	it("gives a plausible width for a typical badge value", () => {
		const width = measure("passing", 13, 600)
		expect(width).toBeGreaterThan(40)
		expect(width).toBeLessThan(60)
	})

	it("knows Latin Extended and Cyrillic letters, not just the fallback", () => {
		const fallback = FONT_METRICS.fallback[400]
		const letters = Array.from("ąęłżПривітґ")
		const known = letters.filter(
			(c) => FONT_METRICS.widths[400][c.codePointAt(0)!] !== undefined
		)
		expect(known.length).toBe(letters.length)
		expect(measure("Привіт", 1000)).not.toBe(6 * fallback)
	})

	it("counts CJK and emoji as one em and combining marks as zero", () => {
		expect(measure("日本", 10)).toBe(20)
		expect(measure("🚀", 10)).toBe(10)
		const acute = String.fromCodePoint(0x0301)
		expect(measure(`e${acute}`, 1000)).toBe(measure("e", 1000))
	})

	it("falls back to the average width for unknown characters", () => {
		expect(measure(String.fromCodePoint(0x0378), 1000, 400)).toBe(
			FONT_METRICS.fallback[400]
		)
	})
})
