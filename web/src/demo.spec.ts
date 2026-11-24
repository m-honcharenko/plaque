import { describe, expect, it } from "bun:test"

import {
	DEMO_BREAKPOINT,
	DEMO_REPO,
	DEMO_WIDTH,
	demoBadges,
	isNarrow
} from "./demo.js"

const ORIGIN = "https://plaque.example"

describe("isNarrow", () => {
	it("turns narrow at the breakpoint, like max-width does", () => {
		expect(isNarrow(DEMO_BREAKPOINT)).toBe(true)
		expect(isNarrow(DEMO_BREAKPOINT + 1)).toBe(false)
		expect(isNarrow(DEMO_WIDTH.min)).toBe(true)
		expect(isNarrow(DEMO_WIDTH.max)).toBe(false)
	})

	it("takes another breakpoint", () => {
		expect(isNarrow(500, 480)).toBe(false)
		expect(isNarrow(480, 480)).toBe(true)
	})
})

describe("demoBadges", () => {
	const badges = demoBadges(ORIGIN)
	const byId = (id: string) => badges.find((badge) => badge.id === id)

	it("is a status and three live metrics of a well-known repository", () => {
		expect(badges.map((badge) => badge.id)).toEqual([
			"build",
			"stars",
			"release",
			"license"
		])
		for (const id of ["stars", "release", "license"]) {
			expect(byId(id)?.wide).toContain(
				`${ORIGIN}/gh/${DEMO_REPO.owner}/${DEMO_REPO.repo}/${id}?`
			)
		}
	})

	it("asks for the full layout when wide", () => {
		for (const badge of badges) expect(badge.wide).toContain("layout=full")
	})

	it("turns the status into an icon and stacks the data", () => {
		expect(byId("build")?.wide.startsWith(`${ORIGIN}/badge?`)).toBe(true)
		expect(byId("build")?.narrow).toContain("layout=compact")
		expect(byId("stars")?.narrow).toContain("layout=vertical")
		expect(byId("release")?.narrow).toContain("layout=vertical")
		expect(byId("license")?.narrow).toContain("layout=vertical")
	})

	it("has alt text for every badge", () => {
		expect(badges.map((badge) => badge.alt)).toEqual([
			"build passing",
			"stars",
			"release",
			"license"
		])
	})
})
