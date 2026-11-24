import {
	COLOR_TOKENS,
	THEMES,
	type ColorToken
} from "../../src/core/badge/badge-options.js"
import { BREAKPOINT_RANGE } from "../../src/core/badge/snippet.js"
import { isIconName } from "../../src/core/icons/icons.js"
import { GITHUB_METRICS } from "../../src/core/ports/value-provider.port.js"
import {
	LIVE_ICON_SOURCES,
	NARROW_CHOICES,
	SOURCES,
	defaultState,
	type BuilderState,
	type ColorChoice
} from "./builder-state.js"

// What a preset keeps: the look, not where the badge is served from or which
// repository or package it follows. A preset is a template, so the same one
// works for any project.
export type Look = Omit<BuilderState, "origin" | "repo" | "pkg">

export type Preset = {
	name: string
	state: Partial<Look>
}

export const MAX_PRESETS = 12
export const NAME_MAX = 30
export const STORAGE_KEY = "plaque-presets"

function token(name: ColorToken): ColorChoice {
	return { mode: "token", token: name, hex: "1a7f37" }
}

// A live badge starts from the defaults of its metric: no label, the
// metric's own icon and color.
function live(
	name: string,
	source: "github" | "npm",
	metric?: Look["metric"]
): Preset {
	return {
		name,
		state: {
			source,
			...(metric === undefined ? {} : { metric }),
			label: "",
			iconSource: "auto"
		}
	}
}

export const BUILT_IN: readonly Preset[] = [
	live("GitHub stars", "github", "stars"),
	live("GitHub CI", "github", "ci"),
	live("Latest release", "github", "release"),
	live("License", "github", "license"),
	live("npm version", "npm"),
	{
		name: "Passing",
		state: { label: "build", value: "passing", icon: "workflow" }
	},
	{
		name: "Failing",
		state: {
			label: "build",
			value: "failing",
			icon: "x-circle",
			valueColor: token("error")
		}
	},
	{
		name: "Beta",
		state: {
			label: "status",
			value: "beta",
			icon: null,
			valueColor: token("warning")
		}
	}
]

// The form after a preset: everything starts from the defaults, then the
// preset's own choices are laid on top. The place to publish from, and the
// repository or package already typed, stay.
export function applyPreset(
	current: BuilderState,
	preset: Preset
): BuilderState {
	return {
		...defaultState(current.origin),
		repo: current.repo,
		pkg: current.pkg,
		...preset.state
	}
}

// The look of the form as a preset.
export function lookOf(state: BuilderState): Look {
	const { origin: _origin, repo: _repo, pkg: _pkg, ...look } = state
	return look
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function oneOf<T extends string>(
	options: readonly T[]
): (value: unknown) => T | undefined {
	return (value) =>
		typeof value === "string" && (options as readonly string[]).includes(value)
			? (value as T)
			: undefined
}

function text(max: number): (value: unknown) => string | undefined {
	return (value) =>
		typeof value === "string" && value.length <= max ? value : undefined
}

function color(value: unknown): ColorChoice | undefined {
	if (!isRecord(value)) return undefined
	const mode = oneOf(["auto", "token", "custom"] as const)(value.mode)
	const name = oneOf(COLOR_TOKENS)(value.token)
	const hex = text(6)(value.hex)
	if (mode === undefined || name === undefined || hex === undefined) {
		return undefined
	}
	return { mode, token: name, hex }
}

// null is a real value for these: "pick one for me" or "no icon".
function orNull<T>(
	parse: (value: unknown) => T | undefined
): (value: unknown) => T | null | undefined {
	return (value) => (value === null ? null : parse(value))
}

const hexInk = (value: unknown): string | undefined =>
	typeof value === "string" && /^[0-9a-f]{6}$/i.test(value) ? value : undefined

const iconName = (value: unknown): string | undefined =>
	typeof value === "string" && isIconName(value) ? value : undefined

const stroke = (value: unknown): number | undefined =>
	typeof value === "number" &&
	Number.isFinite(value) &&
	value > 0 &&
	value <= 24
		? value
		: undefined

const breakpoint = (value: unknown): number | undefined =>
	typeof value === "number" &&
	Number.isInteger(value) &&
	value >= BREAKPOINT_RANGE.min &&
	value <= BREAKPOINT_RANGE.max
		? value
		: undefined

// One reader per field of a preset. Anything the reader does not accept is
// left out, so a stale or edited entry cannot put the form in a state it
// could not reach itself.
const READERS: { [K in keyof Look]: (value: unknown) => Look[K] | undefined } =
	{
		source: oneOf(SOURCES),
		metric: oneOf(GITHUB_METRICS),
		label: text(64),
		value: text(64),
		valueColor: color,
		labelColor: color,
		textColor: orNull(hexInk),
		iconColor: orNull(hexInk),
		iconSource: oneOf(LIVE_ICON_SOURCES),
		icon: orNull(iconName),
		customPath: orNull(text(2000)),
		customStroke: orNull(stroke),
		theme: oneOf(THEMES),
		narrow: oneOf(NARROW_CHOICES),
		breakpoint
	}

function readState(raw: unknown): Partial<Look> {
	if (!isRecord(raw)) return {}
	const state: Record<string, unknown> = {}
	for (const key of Object.keys(READERS) as (keyof Look)[]) {
		const value = (READERS[key] as (value: unknown) => unknown)(raw[key])
		if (value !== undefined) state[key] = value
	}
	return state as Partial<Look>
}

// The saved presets from what the storage holds. Anything that is not a
// list of named presets gives an empty list.
export function parsePresets(raw: string | null): Preset[] {
	if (raw === null) return []
	let data: unknown
	try {
		data = JSON.parse(raw)
	} catch {
		return []
	}
	if (!Array.isArray(data)) return []
	const presets: Preset[] = []
	for (const item of data) {
		if (!isRecord(item)) continue
		const name = typeof item.name === "string" ? item.name.trim() : ""
		if (name === "" || name.length > NAME_MAX) continue
		if (presets.some((preset) => preset.name === name)) continue
		const state = readState(item.state)
		if (Object.keys(state).length === 0) continue
		presets.push({ name, state })
		if (presets.length === MAX_PRESETS) break
	}
	return presets
}

export type Saved =
	| { ok: true; presets: Preset[] }
	| { ok: false; error: string }

// The list with one more preset, or the same name replaced.
export function savePreset(
	presets: readonly Preset[],
	rawName: string,
	state: BuilderState
): Saved {
	const name = rawName.trim()
	if (name === "") return { ok: false, error: "Give the preset a name" }
	if (name.length > NAME_MAX) {
		return { ok: false, error: `Up to ${NAME_MAX} characters` }
	}
	const lower = name.toLowerCase()
	if (BUILT_IN.some((preset) => preset.name.toLowerCase() === lower)) {
		return { ok: false, error: "A built-in preset has this name" }
	}
	const preset: Preset = { name, state: lookOf(state) }
	const exists = presets.some((item) => item.name === name)
	if (!exists && presets.length >= MAX_PRESETS) {
		return { ok: false, error: `Up to ${MAX_PRESETS} saved presets` }
	}
	return {
		ok: true,
		presets: exists
			? presets.map((item) => (item.name === name ? preset : item))
			: [...presets, preset]
	}
}

export function removePreset(
	presets: readonly Preset[],
	name: string
): Preset[] {
	return presets.filter((preset) => preset.name !== name)
}

export type Store = Pick<Storage, "getItem" | "setItem">

// Storage can be missing or refuse (private mode): presets then live until
// the page closes.
export function readPresets(store?: Store): Preset[] {
	try {
		return parsePresets((store ?? localStorage).getItem(STORAGE_KEY))
	} catch {
		return []
	}
}

export function writePresets(presets: readonly Preset[], store?: Store): void {
	try {
		;(store ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(presets))
	} catch {
		// The list still works on the page; it just is not remembered.
	}
}
