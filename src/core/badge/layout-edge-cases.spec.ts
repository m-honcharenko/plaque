import { describe, expect, it } from "bun:test"

import { normalizeConfig, type BadgeInput } from "./badge-config.js"
import { layout, TEXT_CAP } from "./layout.js"

const LONG = "W".repeat(24) // the widest text the limits allow

function sectionsOf(
	input: BadgeInput,
	variant: "full" | "compact" | "vertical"
) {
	return layout(normalizeConfig(input), variant).sections
}

describe("core/badge/layout edge cases", () => {
	describe("no icon", () => {
		it("full: the label is plain text with equal padding", () => {
			const [label, value] = sectionsOf({ label: "build", value: "ok" }, "full")
			expect(label?.icon).toBeNull()
			expect(label?.text?.x).toBe(12)
			expect(label?.box.width).toBe(12 + (label?.text?.width ?? 0) + 12)
			expect(value?.box.x).toBe(label?.box.width ?? -1)
		})

		it("compact: a status keeps only its icon", () => {
			const sections = sectionsOf(
				{ label: "build", value: "passing" },
				"compact"
			)
			expect(sections).toHaveLength(1)
			expect(sections[0]?.role).toBe("value")
			expect(sections[0]?.icon?.name).toBe("check-circle")
			expect(sections[0]?.box).toEqual({ x: 0, y: 0, width: 36, height: 28 })
		})

		it("compact: data keeps only its text", () => {
			const sections = sectionsOf(
				{ label: "release", value: "v2.4.1" },
				"compact"
			)
			expect(sections).toHaveLength(1)
			expect(sections[0]?.text?.text).toBe("v2.4.1")
		})

		it("vertical: the label text stands where the icon would", () => {
			const [top, bottom] = sectionsOf(
				{ label: "release", value: "v2.4.1" },
				"vertical"
			)
			expect(top?.role).toBe("label")
			expect(top?.icon).toBeNull()
			expect(top?.text?.text).toBe("release")
			expect(top?.text?.anchor).toBe("middle")
			expect(bottom?.box.y).toBe(28)
		})
	})

	describe("empty label", () => {
		it("full with an icon: the label section is the icon alone", () => {
			const [label] = sectionsOf({ value: "ok", icon: "tag" }, "full")
			expect(label?.text).toBeNull()
			expect(label?.icon?.name).toBe("tag")
			expect(label?.box.width).toBe(36)
		})

		it("full without an icon: only the value section remains", () => {
			const result = layout(normalizeConfig({ value: "ok" }), "full")
			expect(result.sections).toHaveLength(1)
			expect(result.sections[0]?.role).toBe("value")
			expect(result.sections[0]?.box.x).toBe(0)
			expect(result.width).toBe(result.sections[0]?.box.width ?? -1)
		})

		it("vertical without an icon: a single value row", () => {
			const result = layout(normalizeConfig({ value: "ok" }), "vertical")
			expect(result.sections).toHaveLength(1)
			expect(result.height).toBe(24)
			expect(result.sections[0]?.box.y).toBe(0)
			expect(result.sections[0]?.text?.y).toBe(16.5)
		})
	})

	describe("long text", () => {
		it("cuts a long value with an ellipsis in every variant", () => {
			const caps = {
				full: TEXT_CAP.value,
				compact: TEXT_CAP.compactValue,
				vertical: TEXT_CAP.verticalText
			}
			for (const variant of ["full", "compact", "vertical"] as const) {
				const sections = sectionsOf({ value: LONG, icon: "tag" }, variant)
				const text = sections.at(-1)?.text
				expect(text?.text.endsWith("…")).toBe(true)
				expect(text?.text.length).toBeLessThan(LONG.length)
				// the width is rounded up, so one pixel of slack
				expect(text?.width).toBeLessThanOrEqual(caps[variant] + 1)
			}
		})

		it("cuts a long label in full", () => {
			const [label] = sectionsOf({ label: LONG, value: "ok" }, "full")
			expect(label?.text?.text.endsWith("…")).toBe(true)
			expect(label?.text?.width).toBeLessThanOrEqual(TEXT_CAP.label + 1)
		})

		it("keeps short text as it is", () => {
			const [label, value] = sectionsOf(
				{ label: "build", value: "passing" },
				"full"
			)
			expect(label?.text?.text).toBe("build")
			expect(value?.text?.text).toBe("passing")
		})

		it("never grows past the widest possible badge", () => {
			const input = { label: LONG, value: LONG, icon: "tag" }
			// label: 10 + 16 + 7 + cap + 12, value: 12 + cap + 12
			const widest = 45 + TEXT_CAP.label + 24 + TEXT_CAP.value + 2
			expect(layout(normalizeConfig(input), "full").width).toBeLessThanOrEqual(
				widest
			)
			expect(
				layout(normalizeConfig(input), "vertical").width
			).toBeLessThanOrEqual(TEXT_CAP.verticalText + 24 + 1)
		})
	})

	describe("other scripts", () => {
		it("lays out Cyrillic, CJK and emoji with a positive width", () => {
			for (const value of ["успешно", "成功", "🚀🚀"]) {
				const [text] = sectionsOf({ value }, "full").map((s) => s.text)
				expect(text?.text).toBe(value)
				expect(text?.width).toBeGreaterThan(0)
			}
		})
	})
})
