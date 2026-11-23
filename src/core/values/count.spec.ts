import { describe, expect, it } from "bun:test"

import { formatCount } from "./count.js"

describe("formatCount", () => {
	it.each([
		[0, "0"],
		[7, "7"],
		[999, "999"],
		[1000, "1k"],
		[1099, "1k"],
		[1100, "1.1k"],
		[1234, "1.2k"],
		[1999, "1.9k"],
		[2300, "2.3k"],
		[9999, "9.9k"],
		[10_000, "10k"],
		[15_999, "15k"],
		[999_999, "999k"],
		[1_000_000, "1M"],
		[1_234_567, "1.2M"],
		[12_000_000, "12M"],
		[999_999_999, "999M"],
		[1_000_000_000, "1B"],
		[2_500_000_000, "2.5B"]
	])("shows %i as %s", (count, text) => {
		expect(formatCount(count)).toBe(text)
	})
})
