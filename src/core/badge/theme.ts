import { colorHex, type BadgeColor } from "./badge-config.js"
import type { ColorToken, Theme } from "./badge-options.js"

type Scheme = "light" | "dark"

// The label side of the badge.
const SURFACE: Record<Scheme, { fg: string; chip: string }> = {
	light: { fg: "#1f2328", chip: "#f6f8fa" },
	dark: { fg: "#e6edf3", chip: "#161b22" }
}

// Token colors for the dark scheme, tuned for white text on top. The light
// ones are PALETTE. A custom hex color is the same in both schemes.
export const DARK_PALETTE: Record<ColorToken, string> = {
	success: "2ea043",
	warning: "bf8700",
	error: "da3633",
	info: "388bfd",
	neutral: "6e7681"
}

function valueColor(color: BadgeColor, scheme: Scheme): string {
	if (color.type === "hex" || scheme === "light") return colorHex(color)
	return DARK_PALETTE[color.name]
}

function variables(scheme: Scheme, color: BadgeColor): string {
	const { fg, chip } = SURFACE[scheme]
	return `:root{--fg:${fg};--chip:${chip};--v:#${valueColor(color, scheme)}}`
}

// The CSS variables of a badge. auto starts light and switches with the
// reader's system theme; light and dark fix the theme and have no @media.
export function themeVariables(theme: Theme, color: BadgeColor): string {
	if (theme === "light") return variables("light", color)
	if (theme === "dark") return variables("dark", color)
	return (
		variables("light", color) +
		`@media (prefers-color-scheme:dark){${variables("dark", color)}}`
	)
}
