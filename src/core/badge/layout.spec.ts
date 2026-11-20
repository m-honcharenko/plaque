import { describe, expect, it } from "bun:test"

import { normalizeConfig } from "./badge-config.js"
import { layout, type BadgeLayout } from "./layout.js"

const STATUS = normalizeConfig({
	label: "build",
	value: "passing",
	icon: "workflow"
})
const DATA = normalizeConfig({
	label: "release",
	value: "v2.4.1",
	icon: "tag",
	color: "info"
})

// Sections must cover the badge without gaps or overlaps.
function expectTiled(result: BadgeLayout) {
	if (result.variant === "vertical") {
		let y = 0
		for (const section of result.sections) {
			expect(section.box.x).toBe(0)
			expect(section.box.y).toBe(y)
			expect(section.box.width).toBe(result.width)
			y += section.box.height
		}
		expect(y).toBe(result.height)
		return
	}
	let x = 0
	for (const section of result.sections) {
		expect(section.box.x).toBe(x)
		expect(section.box.y).toBe(0)
		expect(section.box.height).toBe(result.height)
		x += section.box.width
	}
	expect(x).toBe(result.width)
}

describe("core/badge/layout", () => {
	// The same numbers as fixtures/status-full.svg.
	it("lays out full like the status fixture", () => {
		expect(layout(STATUS, "full")).toEqual({
			variant: "full",
			width: 149,
			height: 28,
			sections: [
				{
					role: "label",
					box: { x: 0, y: 0, width: 75, height: 28 },
					icon: { name: "workflow", x: 10, y: 6, size: 16 },
					text: {
						text: "build",
						x: 33,
						y: 18.5,
						width: 30,
						size: 13,
						weight: 400,
						anchor: "start"
					}
				},
				{
					role: "value",
					box: { x: 75, y: 0, width: 74, height: 28 },
					icon: null,
					text: {
						text: "passing",
						x: 112,
						y: 18.5,
						width: 50,
						size: 13,
						weight: 600,
						anchor: "middle"
					}
				}
			]
		})
	})

	// The same numbers as fixtures/status-compact.svg: [icon | status icon].
	it("shows a status as its icon in compact, like the status fixture", () => {
		expect(layout(STATUS, "compact")).toEqual({
			variant: "compact",
			width: 72,
			height: 28,
			sections: [
				{
					role: "label",
					box: { x: 0, y: 0, width: 36, height: 28 },
					icon: { name: "workflow", x: 10, y: 6, size: 16 },
					text: null
				},
				{
					role: "value",
					box: { x: 36, y: 0, width: 36, height: 28 },
					icon: { name: "check-circle", x: 46, y: 6, size: 16 },
					text: null
				}
			]
		})
	})

	// Like fixtures/data-vertical.svg: icon row 28, value row 24.
	it("lays out vertical like the data fixture", () => {
		expect(layout(DATA, "vertical")).toEqual({
			variant: "vertical",
			width: 60,
			height: 52,
			sections: [
				{
					role: "label",
					box: { x: 0, y: 0, width: 60, height: 28 },
					icon: { name: "tag", x: 22, y: 6, size: 16 },
					text: null
				},
				{
					role: "value",
					box: { x: 0, y: 28, width: 60, height: 24 },
					icon: null,
					text: {
						text: "v2.4.1",
						x: 30,
						y: 44.5,
						width: 36,
						size: 12,
						weight: 600,
						anchor: "middle"
					}
				}
			]
		})
	})

	it("keeps a data value as text in compact", () => {
		const result = layout(DATA, "compact")
		const [label, value] = result.sections
		expect(label?.text).toBeNull()
		expect(label?.box.width).toBe(36) // 10 + 16 + 10
		expect(value?.icon).toBeNull()
		expect(value?.text?.text).toBe("v2.4.1")
		expectTiled(result)
	})

	it("picks the status icon by what the status means", () => {
		const icon = (value: string) =>
			layout(normalizeConfig({ value, icon: "tag" }), "compact").sections[1]
				?.icon?.name
		expect(icon("passing")).toBe("check-circle")
		expect(icon("failing")).toBe("x-circle")
		expect(icon("Warning")).toBe("alert")
		expect(icon("building")).toBe("sync")
		expect(icon("queued")).toBe("clock")
		expect(icon("skipped")).toBe("skip")
		expect(icon("cancelled")).toBe("stop")
	})

	it("tiles every variant without gaps", () => {
		for (const variant of ["full", "compact", "vertical"] as const) {
			expectTiled(layout(STATUS, variant))
			expectTiled(layout(DATA, variant))
		}
	})

	it("is narrower in compact and vertical than in full", () => {
		const full = layout(DATA, "full")
		expect(layout(DATA, "compact").width).toBeLessThan(full.width)
		expect(layout(DATA, "vertical").width).toBeLessThan(full.width)
		expect(layout(DATA, "vertical").height).toBeGreaterThan(full.height)
	})

	it("grows with the measured text", () => {
		const short = layout(normalizeConfig({ value: "ok" }), "full")
		const long = layout(normalizeConfig({ value: "operational" }), "full")
		expect(long.width).toBeGreaterThan(short.width)
	})

	it("is pure: equal configs give equal layouts", () => {
		expect(layout(STATUS, "full")).toEqual(layout({ ...STATUS }, "full"))
	})
})
