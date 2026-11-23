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

// One side of the badge: left alone ("auto"), a token or a hex color.
export type ColorMode = "auto" | "token" | "custom"

export type ColorChoice = {
	mode: ColorMode
	token: ColorToken
	// Six hex digits without "#".
	hex: string
}

// The value for the API, or undefined to leave the side to the service.
export function colorParam(choice: ColorChoice): string | undefined {
	if (choice.mode === "auto") return undefined
	return choice.mode === "token" ? choice.token : choice.hex
}

export const ICON_SOURCES = ["library", "custom"] as const
export type IconSource = (typeof ICON_SOURCES)[number]

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
	// Right (or bottom) side. Auto: success, or a shade of the label color.
	valueColor: ColorChoice
	// Left (or top) side. Auto: the surface of the theme.
	labelColor: ColorChoice
	// Ink overrides as six hex digits; null picks a readable one.
	textColor: string | null
	iconColor: string | null
	// Where the icon comes from: the whitelist or the user's own path.
	iconSource: IconSource
	icon: string | null
	// Canonical path data of the custom icon, already checked by
	// extractIconPath.
	customPath: string | null
	// Line width when the custom icon is an outline, null when it is filled.
	customStroke: number | null
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
	| "labelColor"
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
		valueColor: { mode: "auto", token: "success", hex: "1a7f37" },
		labelColor: { mode: "auto", token: "info", hex: "3b73d1" },
		textColor: null,
		iconColor: null,
		iconSource: "library",
		icon: "workflow",
		customPath: null,
		customStroke: null,
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
	if (
		state.valueColor.mode === "custom" &&
		!HEX_COLOR.test(state.valueColor.hex)
	) {
		errors.color = "Six hex digits, for example 1a7f37"
	}
	if (
		state.labelColor.mode === "custom" &&
		!HEX_COLOR.test(state.labelColor.hex)
	) {
		errors.labelColor = "Six hex digits, for example 3b73d1"
	}
	if (
		state.iconSource === "library" &&
		state.icon !== null &&
		!isIconName(state.icon)
	) {
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
	const custom = state.iconSource === "custom"
	let config: BadgeConfig
	try {
		config = normalizeConfig({
			label: state.label,
			value: state.value,
			color: colorParam(state.valueColor),
			labelColor: colorParam(state.labelColor),
			textColor: state.textColor ?? undefined,
			iconColor: state.iconColor ?? undefined,
			icon: custom ? undefined : (state.icon ?? undefined),
			iconPath: custom ? (state.customPath ?? undefined) : undefined,
			iconStroke:
				custom && state.customPath !== null
					? (state.customStroke ?? undefined)
					: undefined,
			theme: state.theme
		})
	} catch {
		return { ok: false, errors: { icon: "This icon is not accepted" } }
	}
	return {
		ok: true,
		config,
		breakpoint: state.breakpoint,
		narrow: pickNarrow(config.value, forcedNarrow(state.narrow)),
		origin
	}
}
