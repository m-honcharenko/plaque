import { describe, expect, it } from "bun:test"

import { build, overridesOf, type Ready } from "./build.js"
import {
	defaultState,
	switchSource,
	type BuilderState,
	type ColorChoice
} from "./builder-state.js"

const PAGE = "https://page.example"
const base = defaultState("https://plaque.example")

function github(patch: Partial<BuilderState> = {}): BuilderState {
	return { ...switchSource(base, "github"), repo: "oven-sh/bun", ...patch }
}

function npm(patch: Partial<BuilderState> = {}): BuilderState {
	return { ...switchSource(base, "npm"), pkg: "react", ...patch }
}

function ready(state: BuilderState): Ready {
	const result = build(state, PAGE)
	if (!result.ok) throw new Error(JSON.stringify(result.errors))
	return result
}

function errorsOf(state: BuilderState) {
	const result = build(state, PAGE)
	if (result.ok) throw new Error("expected errors")
	return result.errors
}

function choice(
	mode: ColorChoice["mode"],
	patch: Partial<ColorChoice> = {}
): ColorChoice {
	return { mode, token: "success", hex: "1a7f37", ...patch }
}

describe("build a typed badge", () => {
	it("points the preview at the page and the code at the form's service", () => {
		const result = ready(base)
		expect(result.live).toBe(false)
		expect(result.wideUrl.startsWith(`${PAGE}/badge?`)).toBe(true)
		expect(result.narrowUrl).toContain("layout=compact")
		expect(result.snippet).toContain("https://plaque.example/badge?")
		expect(result.alt).toBe("build passing")
	})

	it("reports the same problems as the form always did", () => {
		expect(errorsOf({ ...base, value: " " }).value).toBeDefined()
	})
})

describe("build a live GitHub badge", () => {
	it("makes the live routes for the preview and the snippet", () => {
		const result = ready(github())
		expect(result.live).toBe(true)
		expect(result.wideUrl).toBe(`${PAGE}/gh/oven-sh/bun/stars?layout=full`)
		expect(result.narrowUrl).toBe(
			`${PAGE}/gh/oven-sh/bun/stars?layout=vertical`
		)
		expect(result.snippet).toContain(
			"https://plaque.example/gh/oven-sh/bun/stars"
		)
		expect(result.snippet).toContain("max-width: 600px")
		expect(result.alt).toBe("stars")
	})

	it("treats CI as a status: compact on narrow screens", () => {
		const result = ready(github({ metric: "ci" }))
		expect(result.narrow).toBe("compact")
		expect(result.narrowUrl).toContain("/gh/oven-sh/bun/ci?layout=compact")
	})

	it("accepts a pasted link or a .git name", () => {
		for (const repo of [
			"https://github.com/oven-sh/bun",
			"https://github.com/oven-sh/bun/",
			"oven-sh/bun.git",
			"  oven-sh/bun  "
		]) {
			expect(ready(github({ repo })).wideUrl).toContain("/gh/oven-sh/bun/")
		}
	})

	it("rejects names that are not owner/repo", () => {
		for (const repo of ["", "bun", "a/b/c", "oven sh/bun", "../x", "a/b?x=1"]) {
			expect(errorsOf(github({ repo })).repo).toBeDefined()
		}
	})

	it("does not ask for a value", () => {
		expect(ready(github({ value: "" })).live).toBe(true)
	})

	it("uses the metric's label unless one is typed", () => {
		expect(ready(github({ label: "" })).alt).toBe("stars")
		expect(ready(github({ label: "GitHub stars" })).alt).toBe("GitHub stars")
		expect(ready(github({ label: "GitHub stars" })).wideUrl).toContain(
			"label=GitHub+stars"
		)
	})

	it("still checks the shared fields", () => {
		const errors = errorsOf(
			github({
				label: "x".repeat(25),
				valueColor: choice("custom", { hex: "12" }),
				breakpoint: 100,
				origin: "nope"
			})
		)
		expect(errors.label).toBeDefined()
		expect(errors.color).toBeDefined()
		expect(errors.breakpoint).toBeDefined()
		expect(errors.origin).toBeDefined()
	})
})

describe("build a live npm badge", () => {
	it("follows the version of a package", () => {
		const result = ready(npm())
		expect(result.wideUrl).toBe(`${PAGE}/npm/react/version?layout=full`)
		expect(result.narrow).toBe("vertical")
		expect(result.alt).toBe("npm")
	})

	it("keeps a scoped name in one piece", () => {
		expect(ready(npm({ pkg: "@nestjs/core" })).wideUrl).toContain(
			"/npm/@nestjs%2Fcore/version"
		)
	})

	it("rejects a name npm would not have", () => {
		for (const pkg of ["", "a/b", "a b", "../x", "@scope"]) {
			expect(errorsOf(npm({ pkg })).pkg).toBeDefined()
		}
	})
})

describe("overridesOf", () => {
	it("leaves everything to the metric by default", () => {
		expect(overridesOf(github())).toEqual({})
	})

	it("passes only what was set", () => {
		const state = github({
			label: "stars",
			valueColor: choice("token", { token: "warning" }),
			labelColor: choice("custom", { hex: "3b73d1" }),
			textColor: "ffffff",
			iconColor: "ffaa00",
			theme: "dark"
		})
		expect(overridesOf(state)).toEqual({
			label: "stars",
			color: "warning",
			labelColor: "3b73d1",
			textColor: "ffffff",
			iconColor: "ffaa00",
			theme: "dark"
		})
	})

	it("sends a library icon, a custom path or nothing", () => {
		expect(
			overridesOf(github({ iconSource: "library", icon: "star" }))
		).toEqual({ icon: "star" })
		expect(overridesOf(github({ iconSource: "library", icon: null }))).toEqual(
			{}
		)
		expect(
			overridesOf(
				github({
					iconSource: "custom",
					customPath: "M12 2L2 22h20z",
					customStroke: 1.5
				})
			)
		).toEqual({ iconPath: "M12 2L2 22h20z", iconStroke: 1.5 })
		expect(
			overridesOf(github({ iconSource: "custom", customPath: null }))
		).toEqual({})
		expect(overridesOf(github({ iconSource: "auto", icon: "star" }))).toEqual(
			{}
		)
	})

	it("puts the icon options into the live URL", () => {
		const result = ready(github({ iconSource: "library", icon: "tag" }))
		expect(result.wideUrl).toContain("icon=tag")
	})

	it("reports a custom path the service would not accept", () => {
		const errors = errorsOf(
			github({ iconSource: "custom", customPath: "<script>" })
		)
		expect(errors.icon).toBeDefined()
	})
})

describe("switchSource", () => {
	it("empties the default label when going live and restores it back", () => {
		const live = switchSource(base, "github")
		expect(live.label).toBe("")
		expect(live.iconSource).toBe("auto")
		const typed = switchSource(live, "static")
		expect(typed.label).toBe("build")
		expect(typed.iconSource).toBe("library")
	})

	it("keeps a label the person typed", () => {
		const live = switchSource({ ...base, label: "tests" }, "npm")
		expect(live.label).toBe("tests")
		expect(switchSource(live, "static").label).toBe("tests")
	})

	it("keeps a custom icon on both sides", () => {
		const custom = { ...base, iconSource: "custom" as const }
		expect(switchSource(custom, "github").iconSource).toBe("custom")
		expect(
			switchSource(switchSource(custom, "github"), "static").iconSource
		).toBe("custom")
	})

	it("moving between live sources changes only the source", () => {
		const live = switchSource(base, "github")
		const other = switchSource(live, "npm")
		expect(other).toEqual({ ...live, source: "npm" })
	})
})
