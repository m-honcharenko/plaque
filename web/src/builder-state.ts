import {
	normalizeConfig,
	type BadgeConfig
} from "../../src/core/badge/badge-config.js"
import {
	HEX_COLOR,
	LIMITS,
	type ColorToken,
	type Theme
} from "../../src/core/badge/badge-options.js"
import {
	BREAKPOINT_RANGE,
	DEFAULT_BREAKPOINT,
	pickNarrow,
	type NarrowLayout
} from "../../src/core/badge/snippet.js"
import { isIconName } from "../../src/core/icons/icons.js"

export type ColorMode = "token" | "custom"

export const NARROW_CHOICES = ["auto", "compact", "vertical"] as const
export type NarrowChoice = (typeof NARROW_CHOICES)[number]

export function forcedNarrow(choice: NarrowChoice): NarrowLayout | undefined {
	return choice === "auto" ? undefined : choice
}

// What the form holds. Everything is raw input; validate() turns it into a
// BadgeConfig or a list of problems.
export type BuilderState = {
	label: string
	value: string
	colorMode: ColorMode
	token: ColorToken
	// Six hex digits without "#".
	hex: string
	icon: string | null
	theme: Theme
	// "auto" lets the value decide: a status is compact, data is vertical.
	narrow: NarrowChoice
	breakpoint: number
	// Where the badges are served from, as written in the snippet.
	origin: string
}

export type Field =
	| "label"
	| "value"
	| "color"
	| "icon"
	| "breakpoint"
	| "origin"

export type Errors = Partial<Record<Field, string>>

export type Validation =
	| {
			ok: true
			config: BadgeConfig
			breakpoint: number
			narrow: NarrowLayout
			origin: string
	  }
	| { ok: false; errors: Errors }

export function defaultState(origin: string): BuilderState {
	return {
		label: "build",
		value: "passing",
		colorMode: "token",
		token: "success",
		hex: "1a7f37",
		icon: "workflow",
		theme: "auto",
		narrow: "auto",
		breakpoint: DEFAULT_BREAKPOINT,
		origin
	}
}

// "https://host/path/" becomes "https://host/path"; null if it is not an
// http(s) URL.
export function cleanOrigin(raw: string): string | null {
	try {
		const url = new URL(raw.trim())
		if (url.protocol !== "http:" && url.protocol !== "https:") return null
		return `${url.origin}${url.pathname.replace(/\/+$/, "")}`
	} catch {
		return null
	}
}

// The same rules as the API, so the preview never shows an "invalid params"
// badge for something the form allowed.
export function validate(state: BuilderState): Validation {
	const errors: Errors = {}
	if (state.label.length > LIMITS.label) {
		errors.label = `Up to ${LIMITS.label} characters`
	}
	if (state.value.trim() === "") {
		errors.value = "Required"
	} else if (state.value.length > LIMITS.value) {
		errors.value = `Up to ${LIMITS.value} characters`
	}
	if (state.colorMode === "custom" && !HEX_COLOR.test(state.hex)) {
		errors.color = "Six hex digits, for example 1a7f37"
	}
	if (state.icon !== null && !isIconName(state.icon)) {
		errors.icon = "Unknown icon"
	}
	if (
		!Number.isInteger(state.breakpoint) ||
		state.breakpoint < BREAKPOINT_RANGE.min ||
		state.breakpoint > BREAKPOINT_RANGE.max
	) {
		errors.breakpoint = `From ${BREAKPOINT_RANGE.min} to ${BREAKPOINT_RANGE.max}`
	}
	const origin = cleanOrigin(state.origin)
	if (origin === null) errors.origin = "Use a full http(s) URL"

	if (origin === null || Object.keys(errors).length > 0) {
		return { ok: false, errors }
	}
	const config = normalizeConfig({
		label: state.label,
		value: state.value,
		color: state.colorMode === "token" ? state.token : state.hex,
		icon: state.icon ?? undefined,
		theme: state.theme
	})
	return {
		ok: true,
		config,
		breakpoint: state.breakpoint,
		narrow: pickNarrow(config.value, forcedNarrow(state.narrow)),
		origin
	}
}
