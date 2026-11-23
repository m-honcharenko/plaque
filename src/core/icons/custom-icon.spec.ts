import { describe, expect, it } from "bun:test"

import {
	ICON_PATH_MAX_LENGTH,
	isIconPath,
	parseIconPath
} from "./custom-icon.js"

describe("parseIconPath", () => {
	it.each([
		["M12 2L2 22h20z", "M12 2L2 22h20z"],
		["M0 0 L10 10", "M0 0L10 10"],
		["m1,1 2,2 3,3", "m1 1 2 2 3 3"],
		["M0 0H5V5Z", "M0 0H5V5Z"],
		["M0 0C1 1 2 2 3 3S4 4 5 5", "M0 0C1 1 2 2 3 3S4 4 5 5"],
		["M0 0Q1 1 2 2T3 3", "M0 0Q1 1 2 2T3 3"],
		["M0-1.5.5.5", "M0 -1.5 .5 .5"],
		["M0 0a2 2 0 011 1", "M0 0a2 2 0 0 1 1 1"],
		["M0 0z M5 5z", "M0 0zM5 5z"]
	])("accepts %s", (raw, canonical) => {
		expect(parseIconPath(raw)).toBe(canonical)
	})

	it.each([
		"",
		"   ",
		"12 2",
		"L0 0",
		"M0",
		"M0 0 L1",
		"M0 0 X1 1",
		"M0 0z 1 1",
		"M0 0 a2 2 0 21 1 1",
		"M0 0 1e3 1",
		"M0 0 L101 0",
		"M0 0 L-101 0",
		"M0 0 <script>alert(1)</script>",
		'M0 0" onload="x',
		"M0 0 L1 1 url(#a)",
		"M0 0; L1 1",
		"M0 0\u0000"
	])("rejects %j", (raw) => {
		expect(parseIconPath(raw)).toBeNull()
	})

	it("accepts the longest allowed path and rejects one more", () => {
		const unit = "L1 1"
		const head = "M0 0"
		const fits = head + unit.repeat(Math.floor((ICON_PATH_MAX_LENGTH - 4) / 4))
		expect(fits.length).toBeLessThanOrEqual(ICON_PATH_MAX_LENGTH)
		expect(isIconPath(fits)).toBe(true)
		expect(isIconPath(fits + "L1 1".repeat(2))).toBe(false)
	})

	it("rejects a path whose canonical form would be over the limit", () => {
		const raw = "M0 0" + "L.5.5".repeat(99)
		expect(raw.length).toBeLessThanOrEqual(ICON_PATH_MAX_LENGTH)
		expect(parseIconPath(raw)).toBeNull()
	})

	it("is idempotent", () => {
		const once = parseIconPath("M 12,2 L2 22 h20 z")
		expect(once).not.toBeNull()
		expect(parseIconPath(once ?? "")).toBe(once)
	})

	it("only ever outputs path characters", () => {
		const out = parseIconPath("M 1,2\n\t3 4 l5 6")
		expect(out).toMatch(/^[MmLlHhVvCcSsQqTtAaZz0-9.+\- ]+$/)
	})
})
