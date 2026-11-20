import { describe, expect, it } from "bun:test"

import { measure } from "./measure.js"
import { ELLIPSIS, truncateToWidth } from "./truncate.js"

const SIZE = 13

describe("truncateToWidth", () => {
	it("returns text that fits unchanged", () => {
		expect(truncateToWidth("passing", 100, SIZE, 600)).toBe("passing")
		expect(truncateToWidth("", 10, SIZE)).toBe("")
	})

	it("cuts long text and ends with an ellipsis", () => {
		const text = "a very long release name that will not fit"
		const result = truncateToWidth(text, 80, SIZE)
		expect(result.endsWith(ELLIPSIS)).toBe(true)
		expect(result.length).toBeLessThan(text.length)
		expect(text.startsWith(result.slice(0, -1))).toBe(true)
	})

	it("keeps the result within the limit", () => {
		for (const text of [
			"passing and very stable",
			"Привіт, світе! Як справи?"
		]) {
			for (const max of [20, 40, 80, 120]) {
				const result = truncateToWidth(text, max, SIZE, 600)
				expect(measure(result, SIZE, 600)).toBeLessThanOrEqual(max)
			}
		}
	})

	it("keeps as much text as fits", () => {
		const text = "abcdefghijklmnop"
		const result = truncateToWidth(text, 60, SIZE)
		const longer = `${text.slice(0, result.length)}${ELLIPSIS}`
		expect(measure(longer, SIZE)).toBeGreaterThan(60)
	})

	it("does not leave a space before the ellipsis", () => {
		const result = truncateToWidth("hello world again", 60, SIZE)
		expect(result).not.toMatch(/\s…$/)
	})

	it("never splits an emoji sequence or a combining mark", () => {
		const zwj = String.fromCodePoint(0x200d)
		const acute = String.fromCodePoint(0x0301)
		const man = String.fromCodePoint(0x1f468)
		const woman = String.fromCodePoint(0x1f469)
		const girl = String.fromCodePoint(0x1f467)
		const family = [man, woman, girl].join(zwj)
		const text = `${family}${family}${family}e${acute}e${acute}e${acute}`
		for (let max = 5; max < 80; max += 5) {
			const result = truncateToWidth(text, max, SIZE)
			const body = result.replace(ELLIPSIS, "")
			expect(body.endsWith(zwj)).toBe(false)
			// Every kept family is whole: two joiners per family.
			expect((body.split(zwj).length - 1) % 2).toBe(0)
			// A combining mark is never left without its base letter.
			expect(body.startsWith(acute)).toBe(false)
		}
	})

	it("returns just the ellipsis when nothing else fits", () => {
		expect(truncateToWidth("overflow", 1, SIZE)).toBe(ELLIPSIS)
		expect(truncateToWidth("overflow", 0, SIZE)).toBe(ELLIPSIS)
	})
})
