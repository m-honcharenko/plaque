import { describe, expect, it } from "bun:test"

import { normalizeColor, PALETTE } from "./badge-config.js"
import { COLOR_TOKENS } from "./badge-options.js"
import { DARK_PALETTE, themeVariables } from "./theme.js"

const SUCCESS = normalizeColor("success")
const CUSTOM = normalizeColor("ff00aa")

// Relative luminance and contrast ratio as in WCAG 2.
function luminance(hex: string): number {
	const [r, g, b] = [0, 2, 4].map((at) => {
		const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255
		return channel <= 0.03928
			? channel / 12.92
			: ((channel + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

function contrastWithWhite(hex: string): number {
	return 1.05 / (luminance(hex) + 0.05)
}

describe("core/badge/theme", () => {
	it("starts light and switches to dark by the system theme in auto", () => {
		const css = themeVariables("auto", SUCCESS)
		expect(css).toBe(
			":root{--fg:#1f2328;--chip:#f6f8fa;--v:#1a7f37}" +
				"@media (prefers-color-scheme:dark){" +
				":root{--fg:#e6edf3;--chip:#161b22;--v:#2ea043}}"
		)
	})

	it("fixes the light theme without @media", () => {
		expect(themeVariables("light", SUCCESS)).toBe(
			":root{--fg:#1f2328;--chip:#f6f8fa;--v:#1a7f37}"
		)
	})

	it("fixes the dark theme without @media", () => {
		expect(themeVariables("dark", SUCCESS)).toBe(
			":root{--fg:#e6edf3;--chip:#161b22;--v:#2ea043}"
		)
	})

	it("keeps a custom hex color the same in every theme", () => {
		expect(themeVariables("light", CUSTOM)).toContain("--v:#ff00aa")
		expect(themeVariables("dark", CUSTOM)).toContain("--v:#ff00aa")
		const auto = themeVariables("auto", CUSTOM)
		expect(auto.match(/--v:#ff00aa/g)).toHaveLength(2)
	})

	it("has a light and a dark color for every token", () => {
		for (const token of COLOR_TOKENS) {
			expect(PALETTE[token]).toMatch(/^[0-9a-f]{6}$/)
			expect(DARK_PALETTE[token]).toMatch(/^[0-9a-f]{6}$/)
		}
	})

	it("keeps white text readable on every token color", () => {
		for (const token of COLOR_TOKENS) {
			expect(contrastWithWhite(PALETTE[token])).toBeGreaterThanOrEqual(3)
			expect(contrastWithWhite(DARK_PALETTE[token])).toBeGreaterThanOrEqual(3)
		}
	})
})
