import { describe, expect, it } from "bun:test"

import {
	INK_DARK,
	INK_LIGHT,
	luminance,
	readableInk,
	shadeOf
} from "./colors.js"

describe("luminance", () => {
	it("is 0 for black and 1 for white", () => {
		expect(luminance("000000")).toBe(0)
		expect(luminance("ffffff")).toBeCloseTo(1, 5)
	})
})

describe("readableInk", () => {
	it.each(["1a7f37", "0969da", "cf222e", "6e7781", "3b73d1", "000000"])(
		"keeps white on %s",
		(background) => {
			expect(readableInk(background)).toBe(INK_LIGHT)
		}
	)

	it.each(["ffffff", "f6f8fa", "ffd33d", "e8e8e8"])(
		"uses the dark ink on %s",
		(background) => {
			expect(readableInk(background)).toBe(INK_DARK)
		}
	)
})

describe("shadeOf", () => {
	it("mixes a quarter of black into an ordinary color", () => {
		expect(shadeOf("3b73d1")).toBe("2c569d")
		expect(shadeOf("ffffff")).toBe("bfbfbf")
	})

	it("lightens a nearly black color instead", () => {
		expect(shadeOf("000000")).toBe("333333")
	})

	it("always returns six hex digits", () => {
		for (const hex of ["000000", "ffffff", "010203", "fe00aa"]) {
			expect(shadeOf(hex)).toMatch(/^[0-9a-f]{6}$/)
		}
	})
})
