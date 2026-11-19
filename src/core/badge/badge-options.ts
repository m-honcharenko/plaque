export const COLOR_TOKENS = [
	"success",
	"warning",
	"error",
	"info",
	"neutral"
] as const
export const THEMES = ["auto", "light", "dark"] as const
export const LAYOUTS = ["full", "compact", "vertical"] as const

export type ColorToken = (typeof COLOR_TOKENS)[number]
export type Theme = (typeof THEMES)[number]
export type Layout = (typeof LAYOUTS)[number]

export const LIMITS = {
	label: 24,
	value: 24,
	icon: 32
} as const

// Six hex digits without "#": a "#" in a URL starts the fragment.
export const HEX_COLOR = /^[0-9a-fA-F]{6}$/
export const ICON_NAME = /^[a-z0-9-]+$/
