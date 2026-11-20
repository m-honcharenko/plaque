import { describe, expect, it } from "bun:test"

import { ICON_NAME, LIMITS } from "../badge/badge-options.js"
import { getIcon, iconPath, ICON_NAMES, isIconName } from "./icons.js"

const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s-]+$/

describe("icon whitelist", () => {
	it("contains UI and brand icons", () => {
		expect(ICON_NAMES).toEqual(
			expect.arrayContaining([
				"check",
				"x",
				"star",
				"workflow",
				"github",
				"npm"
			])
		)
	})

	it("has unique, sorted names that the DTO would accept", () => {
		expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length)
		expect([...ICON_NAMES].sort()).toEqual(ICON_NAMES)
		for (const name of ICON_NAMES) {
			expect(name).toMatch(ICON_NAME)
			expect(name.length).toBeLessThanOrEqual(LIMITS.icon)
		}
	})

	it("holds only plain path data and known grid sizes", () => {
		for (const name of ICON_NAMES) {
			const icon = getIcon(name)!
			expect([16, 24]).toContain(icon.size)
			expect(icon.d).toMatch(PATH_DATA)
		}
	})
})

describe("getIcon", () => {
	it("returns an icon for a whitelisted name", () => {
		expect(getIcon("check")?.size).toBe(16)
		expect(getIcon("github")?.size).toBe(24)
	})

	it.each(["", "Check", "unknown", "__proto__", "constructor", "toString"])(
		"returns undefined for %p",
		(name) => {
			expect(isIconName(name)).toBe(false)
			expect(getIcon(name)).toBeUndefined()
		}
	)
})

describe("iconPath", () => {
	it("renders a single path element with the class and no fill", () => {
		const icon = getIcon("check")!
		const svg = iconPath(icon)
		expect(svg).toBe(`<path class="icon" d="${icon.d}"/>`)
		expect(svg.match(/</g)?.length).toBe(1)
		expect(svg).not.toContain("fill")
	})
})
