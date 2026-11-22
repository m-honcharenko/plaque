import type { BadgeConfig } from "./badge-config.js"
import type { Layout } from "./badge-options.js"
import { escapeXml } from "./render-badge.js"
import { narrowLayout } from "./value-kind.js"

export const DEFAULT_BREAKPOINT = 600
export const BREAKPOINT_RANGE = { min: 320, max: 1200 } as const

export type SnippetOptions = {
	// Where the badge endpoint lives, without a trailing slash.
	origin: string
	// Viewport width in px at which the narrow layout takes over.
	breakpoint: number
	// Forces the narrow layout. Left out, it follows the value: a status
	// becomes compact, data becomes vertical.
	narrow?: NarrowLayout
}

export type NarrowLayout = Extract<Layout, "compact" | "vertical">

export function pickNarrow(value: string, forced?: NarrowLayout): NarrowLayout {
	return forced ?? narrowLayout(value)
}

// The /badge URL that renders this config in the given layout.
export function badgeUrl(
	origin: string,
	config: BadgeConfig,
	layout: Layout
): string {
	const params = new URLSearchParams()
	if (config.label !== "") params.set("label", config.label)
	params.set("value", config.value)
	params.set(
		"color",
		config.color.type === "token" ? config.color.name : config.color.value
	)
	if (config.icon !== null) params.set("icon", config.icon)
	params.set("theme", config.theme)
	params.set("layout", layout)
	return `${origin}/badge?${params}`
}

// HTML for a README: the full badge by default, a narrow one on small
// screens. Anything without <picture> support still gets the <img>.
export function renderSnippet(
	config: BadgeConfig,
	{ origin, breakpoint, narrow: forced }: SnippetOptions
): string {
	const narrow = escapeXml(
		badgeUrl(origin, config, pickNarrow(config.value, forced))
	)
	const full = escapeXml(badgeUrl(origin, config, "full"))
	const alt = escapeXml(
		config.label === "" ? config.value : `${config.label}: ${config.value}`
	)
	return [
		"<picture>",
		`  <source media="(max-width: ${breakpoint}px)" srcset="${narrow}">`,
		`  <img src="${full}" alt="${alt}">`,
		"</picture>",
		""
	].join("\n")
}
