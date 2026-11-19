import {
	COLOR_TOKENS,
	HEX_COLOR,
	type ColorToken,
	type Layout,
	type Theme
} from "./badge-options.js"

export type BadgeColor =
	| { type: "token"; name: ColorToken }
	| { type: "hex"; value: string }

// Canonical form: every field is set and normalized.
export type BadgeConfig = {
	label: string
	value: string
	color: BadgeColor
	icon: string | null
	theme: Theme
	layout: Layout
}

// Raw input as it comes from the outside world (already validated).
export type BadgeInput = {
	label?: string
	value: string
	color?: string
	icon?: string
	theme?: Theme
	layout?: Layout
}

export const DEFAULTS = {
	color: "success",
	theme: "auto",
	layout: "full"
} as const satisfies { color: ColorToken; theme: Theme; layout: Layout }

export const PALETTE: Record<ColorToken, string> = {
	success: "2da44e",
	warning: "bf8700",
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

export function normalizeConfig(input: BadgeInput): BadgeConfig {
	return {
		label: (input.label ?? "").trim(),
		value: input.value.trim(),
		color: normalizeColor(input.color),
		icon: input.icon ? input.icon : null,
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
	return JSON.stringify([
		config.label,
		config.value,
		color,
		config.icon,
		config.theme,
		config.layout
	])
}
