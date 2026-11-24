import { describe, expect, it } from "bun:test"

import { build } from "./build.js"
import { defaultState, type BuilderState } from "./builder-state.js"
import {
	BUILT_IN,
	MAX_PRESETS,
	NAME_MAX,
	STORAGE_KEY,
	applyPreset,
	lookOf,
	parsePresets,
	readPresets,
	removePreset,
	savePreset,
	writePresets,
	type Preset,
	type Saved,
	type Store
} from "./presets.js"

const PAGE = "https://page.example"
const current: BuilderState = {
	...defaultState("https://plaque.example"),
	repo: "oven-sh/bun",
	pkg: "react"
}

function saved(result: Saved): Preset[] {
	if (!result.ok) throw new Error(result.error)
	return result.presets
}

function memoryStore(initial: Record<string, string> = {}): Store {
	const data = new Map(Object.entries(initial))
	return {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, value)
	}
}

const brokenStore: Store = {
	getItem: () => {
		throw new Error("denied")
	},
	setItem: () => {
		throw new Error("denied")
	}
}

describe("built-in presets", () => {
	it("have unique names", () => {
		const names = BUILT_IN.map((preset) => preset.name.toLowerCase())
		expect(new Set(names).size).toBe(names.length)
	})

	it("all make a badge the service accepts", () => {
		for (const preset of BUILT_IN) {
			const result = build(applyPreset(current, preset), PAGE)
			expect(result.ok).toBe(true)
		}
	})

	it("only the typed ones are static", () => {
		const live = BUILT_IN.filter((preset) => preset.state.source !== undefined)
		expect(live.map((preset) => preset.name)).toEqual([
			"GitHub stars",
			"GitHub CI",
			"Latest release",
			"License",
			"npm version"
		])
	})

	it("follow the metric they are named after", () => {
		const url = (name: string) => {
			const preset = BUILT_IN.find((item) => item.name === name)
			const result = build(applyPreset(current, preset as Preset), PAGE)
			return result.ok ? result.wideUrl : ""
		}
		expect(url("GitHub stars")).toContain("/gh/oven-sh/bun/stars")
		expect(url("GitHub CI")).toContain("/gh/oven-sh/bun/ci")
		expect(url("Latest release")).toContain("/gh/oven-sh/bun/release")
		expect(url("License")).toContain("/gh/oven-sh/bun/license")
		expect(url("npm version")).toContain("/npm/react/version")
	})
})

describe("applyPreset", () => {
	const stars = BUILT_IN[0] as Preset

	it("keeps the service URL and what was typed for the source", () => {
		const next = applyPreset(current, stars)
		expect(next.origin).toBe("https://plaque.example")
		expect(next.repo).toBe("oven-sh/bun")
		expect(next.pkg).toBe("react")
	})

	it("starts from the defaults, not from the current form", () => {
		const messy: BuilderState = {
			...current,
			theme: "dark",
			textColor: "ffffff",
			breakpoint: 900
		}
		const next = applyPreset(messy, stars)
		expect(next.theme).toBe("auto")
		expect(next.textColor).toBeNull()
		expect(next.breakpoint).toBe(600)
	})

	it("goes back to a typed badge", () => {
		const live = applyPreset(current, stars)
		const passing = BUILT_IN.find((preset) => preset.name === "Passing")
		const next = applyPreset(live, passing as Preset)
		expect(next.source).toBe("static")
		expect(next.label).toBe("build")
		expect(next.iconSource).toBe("library")
	})
})

describe("savePreset", () => {
	it("keeps the look but not the repository, package or service", () => {
		const list = saved(
			savePreset([], "Mine", { ...current, theme: "dark", label: "x" })
		)
		expect(list).toHaveLength(1)
		const state = list[0]?.state as Record<string, unknown>
		expect(state.theme).toBe("dark")
		expect(state.label).toBe("x")
		expect("origin" in state).toBe(false)
		expect("repo" in state).toBe(false)
		expect("pkg" in state).toBe(false)
	})

	it("applies back to the same look", () => {
		const look: BuilderState = { ...current, theme: "light", value: "ok" }
		const list = saved(savePreset([], "Mine", look))
		const next = applyPreset(current, list[0] as Preset)
		expect(next.theme).toBe("light")
		expect(next.value).toBe("ok")
	})

	it("trims the name and replaces one with the same name", () => {
		const first = saved(savePreset([], "  Mine ", current))
		expect(first[0]?.name).toBe("Mine")
		const second = saved(savePreset(first, "Mine", { ...current, value: "v2" }))
		expect(second).toHaveLength(1)
		expect(second[0]?.state.value).toBe("v2")
	})

	it("rejects an empty or long name", () => {
		expect(savePreset([], "   ", current).ok).toBe(false)
		expect(savePreset([], "x".repeat(NAME_MAX + 1), current).ok).toBe(false)
		expect(savePreset([], "x".repeat(NAME_MAX), current).ok).toBe(true)
	})

	it("rejects the name of a built-in preset, in any case", () => {
		expect(savePreset([], "Passing", current).ok).toBe(false)
		expect(savePreset([], "github STARS", current).ok).toBe(false)
	})

	it("limits the list, but still lets one be replaced", () => {
		let list: Preset[] = []
		for (let index = 0; index < MAX_PRESETS; index += 1) {
			list = saved(savePreset(list, `p${index}`, current))
		}
		expect(savePreset(list, "one more", current).ok).toBe(false)
		expect(savePreset(list, "p0", current).ok).toBe(true)
	})
})

describe("removePreset", () => {
	it("drops one by name", () => {
		const list = saved(
			savePreset(saved(savePreset([], "a", current)), "b", current)
		)
		expect(removePreset(list, "a").map((preset) => preset.name)).toEqual(["b"])
		expect(removePreset(list, "zzz")).toHaveLength(2)
	})
})

describe("parsePresets", () => {
	it("round-trips what was saved", () => {
		const list = saved(savePreset([], "Mine", { ...current, theme: "dark" }))
		expect(parsePresets(JSON.stringify(list))).toEqual(list)
	})

	it("gives an empty list for anything that is not a list", () => {
		for (const raw of [null, "", "nope", "{}", "42", '"x"', "null"]) {
			expect(parsePresets(raw)).toEqual([])
		}
	})

	it("skips entries without a name or a usable look", () => {
		const raw = JSON.stringify([
			null,
			"x",
			{ name: "", state: { theme: "dark" } },
			{ name: "no state" },
			{ name: "empty", state: {} },
			{ name: "junk", state: { theme: "neon", breakpoint: 5 } },
			{ name: "ok", state: { theme: "dark" } }
		])
		expect(parsePresets(raw).map((preset) => preset.name)).toEqual(["ok"])
	})

	it("keeps only the fields it understands, with valid values", () => {
		const raw = JSON.stringify([
			{
				name: "mixed",
				state: {
					theme: "dark",
					breakpoint: 99999,
					source: "gitlab",
					icon: "no-such-icon",
					valueColor: { mode: "token", token: "error", hex: "1a7f37" },
					labelColor: { mode: "nope", token: "error", hex: "1a7f37" },
					textColor: "ffffff",
					iconColor: "not a color",
					origin: "https://evil.example",
					repo: "a/b",
					extra: 1
				}
			}
		])
		const [preset] = parsePresets(raw)
		expect(preset?.state).toEqual({
			theme: "dark",
			valueColor: { mode: "token", token: "error", hex: "1a7f37" },
			textColor: "ffffff"
		})
	})

	it("accepts null for ink, icon and custom icon", () => {
		const raw = JSON.stringify([
			{
				name: "nulls",
				state: {
					textColor: null,
					icon: null,
					customPath: null,
					customStroke: null
				}
			}
		])
		expect(parsePresets(raw)[0]?.state).toEqual({
			textColor: null,
			icon: null,
			customPath: null,
			customStroke: null
		})
	})

	it("drops duplicates and stops at the limit", () => {
		const entry = (name: string) => ({ name, state: { theme: "dark" } })
		const dup = parsePresets(JSON.stringify([entry("a"), entry("a")]))
		expect(dup).toHaveLength(1)
		const many = Array.from({ length: MAX_PRESETS + 5 }, (_, i) =>
			entry(`p${i}`)
		)
		expect(parsePresets(JSON.stringify(many))).toHaveLength(MAX_PRESETS)
	})

	it("never lets a stored preset break the form", () => {
		const raw = JSON.stringify([
			{
				name: "weird",
				state: { valueColor: "red", labelColor: 5, theme: "dark" }
			}
		])
		const preset = parsePresets(raw)[0] as Preset
		const next = applyPreset(current, preset)
		expect(next.valueColor).toEqual(defaultState("x").valueColor)
		expect(build(next, PAGE).ok).toBe(true)
	})
})

describe("storage", () => {
	it("writes and reads back", () => {
		const store = memoryStore()
		const list = saved(savePreset([], "Mine", current))
		writePresets(list, store)
		expect(readPresets(store)).toEqual(list)
		expect(store.getItem(STORAGE_KEY)).not.toBeNull()
	})

	it("starts empty when nothing was saved", () => {
		expect(readPresets(memoryStore())).toEqual([])
	})

	it("survives a storage that refuses", () => {
		expect(readPresets(brokenStore)).toEqual([])
		expect(() => writePresets([], brokenStore)).not.toThrow()
	})
})

describe("lookOf", () => {
	it("leaves out the service URL, repository and package", () => {
		const look = lookOf(current) as Record<string, unknown>
		expect("origin" in look).toBe(false)
		expect("repo" in look).toBe(false)
		expect("pkg" in look).toBe(false)
		expect(look.label).toBe("build")
	})
})
