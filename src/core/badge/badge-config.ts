import { parseIconPath, parseIconStroke } from "../icons/custom-icon.js"
import {
	COLOR_TOKENS,
	HEX_COLOR,
	type ColorToken,
	type Layout,
	type Theme
} from "./badge-options.js"
import { shadeOf } from "./colors.js"

export type BadgeColor =
	| { type: "token"; name: ColorToken }
	| { type: "hex"; value: string }

// Canonical form: every field is set and normalized.
export type BadgeConfig = {
	label: string
	value: string
	// The value side. Without an explicit color it is a shade of labelColor.
	color: BadgeColor
	// The label side; null keeps the theme's own surface.
	labelColor: BadgeColor | null
	// Ink overrides as six hex digits; null picks a readable one.
	textColor: string | null
	iconColor: string | null
	icon: string | null
	// A custom icon as canonical path data; never set together with `icon`.
	iconPath: string | null
	// Line width when the custom icon is an outline; null means filled.
	iconStroke: number | null
	theme: Theme
	layout: Layout
}

// Raw input as it comes from the outside world (already validated).
export type BadgeInput = {
	label?: string
	value: string
	color?: string
	labelColor?: string
	textColor?: string
	iconColor?: string
	icon?: string
	iconPath?: string
	iconStroke?: number | string
	theme?: Theme
	layout?: Layout
}

export const DEFAULTS = {
	color: "success",
	theme: "auto",
	layout: "full"
} as const satisfies { color: ColorToken; theme: Theme; layout: Layout }

// Token colors for the light scheme, tuned for white text on top. The dark
// scheme has its own set in theme.ts.
export const PALETTE: Record<ColorToken, string> = {
	success: "1a7f37",
	warning: "9a6700",
	error: "cf222e",
	info: "0969da",
	neutral: "6e7781"
}

function isToken(color: string): color is ColorToken {
	return (COLOR_TOKENS as readonly string[]).includes(color)
}

export function normalizeColor(raw: string | undefined): BadgeColor {
	const color = (raw ?? DEFAULTS.color).trim()
	if (isToken(color)) return { type: "token", name: color }
	if (HEX_COLOR.test(color)) {
		return { type: "hex", value: color.toLowerCase() }
	}
	throw new RangeError(`Invalid color: ${color}`)
}

export function colorHex(color: BadgeColor): string {
	return color.type === "token" ? PALETTE[color.name] : color.value
}

// Collapses any whitespace run (tabs, newlines) into one space.
export function normalizeText(text: string): string {
	return text.replace(/\s+/g, " ").trim()
}

export function normalizeIconPath(raw: string | undefined): string | null {
	if (raw === undefined || raw.trim() === "") return null
	const path = parseIconPath(raw)
	if (path === null) throw new RangeError("Invalid icon path")
	return path
}

export function normalizeInk(raw: string | undefined): string | null {
	if (raw === undefined || raw.trim() === "") return null
	const ink = raw.trim()
	if (!HEX_COLOR.test(ink)) throw new RangeError(`Invalid color: ${ink}`)
	return ink.toLowerCase()
}

export function normalizeIconStroke(
	raw: number | string | undefined
): number | null {
	if (raw === undefined || String(raw).trim() === "") return null
	const stroke = parseIconStroke(raw)
	if (stroke === null) throw new RangeError("Invalid icon stroke")
	return stroke
}

export function normalizeConfig(input: BadgeInput): BadgeConfig {
	const iconPath = normalizeIconPath(input.iconPath)
	const iconStroke = normalizeIconStroke(input.iconStroke)
	if (iconStroke !== null && iconPath === null) {
		throw new RangeError("icon-stroke needs icon-path")
	}
	if (iconPath !== null && input.icon) {
		throw new RangeError("icon and icon-path cannot be used together")
	}
	const labelColor =
		input.labelColor === undefined || input.labelColor.trim() === ""
			? null
			: normalizeColor(input.labelColor)
	const explicit = input.color !== undefined && input.color.trim() !== ""
	const color =
		!explicit && labelColor !== null
			? ({ type: "hex", value: shadeOf(colorHex(labelColor)) } as const)
			: normalizeColor(input.color)
	return {
		label: normalizeText(input.label ?? ""),
		value: normalizeText(input.value),
		color,
		labelColor,
		textColor: normalizeInk(input.textColor),
		iconColor: normalizeInk(input.iconColor),
		icon: input.icon ? input.icon : null,
		iconPath,
		iconStroke,
		theme: input.theme ?? DEFAULTS.theme,
		layout: input.layout ?? DEFAULTS.layout
	}
}

// Equal configs always produce the same key, so cache hits are exact.
// A token and its hex twin stay distinct on purpose: the palette may change.
export function configKey(config: BadgeConfig): string {
	const color =
		config.color.type === "token"
			? `t:${config.color.name}`
			: `h:${config.color.value}`
	const labelColor =
		config.labelColor === null
			? null
			: config.labelColor.type === "token"
				? `t:${config.labelColor.name}`
				: `h:${config.labelColor.value}`
	return JSON.stringify([
		config.label,
		config.value,
		color,
		labelColor,
		config.textColor,
		config.iconColor,
		config.icon,
		config.iconPath,
		config.iconStroke,
		config.theme,
		config.layout
	])
}
