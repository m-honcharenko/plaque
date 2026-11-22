import { describe, expect, it } from "bun:test"

import { isDark, parseUiTheme } from "./theme.js"

describe("parseUiTheme", () => {
	it("keeps the three known values", () => {
		expect(parseUiTheme("system")).toBe("system")
		expect(parseUiTheme("light")).toBe("light")
		expect(parseUiTheme("dark")).toBe("dark")
	})

	it("falls back to system for anything else", () => {
		expect(parseUiTheme(null)).toBe("system")
		expect(parseUiTheme("")).toBe("system")
		expect(parseUiTheme("auto")).toBe("system")
		expect(parseUiTheme("DARK")).toBe("system")
	})
})

describe("isDark", () => {
	it("follows the system only in system mode", () => {
		expect(isDark("system", true)).toBe(true)
		expect(isDark("system", false)).toBe(false)
	})

	it("ignores the system when the choice is explicit", () => {
		expect(isDark("light", true)).toBe(false)
		expect(isDark("dark", false)).toBe(true)
	})
})
