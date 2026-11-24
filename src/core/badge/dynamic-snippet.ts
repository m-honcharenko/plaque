import type { ValueQuery } from "../ports/value-provider.port.js"
import { metricLabel, narrowFor, valuePath } from "../values/query.js"
import type { Layout } from "./badge-options.js"
import type { BadgeOverrides } from "./provider-input.js"
import { escapeXml } from "./render-badge.js"

// The options a dynamic badge URL carries, as the URL names them.
const PARAMS = [
	["label", "label"],
	["color", "color"],
	["label-color", "labelColor"],
	["text-color", "textColor"],
	["icon-color", "iconColor"],
	["icon", "icon"],
	["icon-path", "iconPath"],
	["icon-stroke", "iconStroke"],
	["theme", "theme"]
] as const

export type DynamicSnippetOptions = {
	// Where the badge endpoints live, without a trailing slash.
	origin: string
	// Viewport width in px at which the narrow layout takes over.
	breakpoint: number
}

// The URL of the live badge: the route of the query, the options the caller
// set (an empty label counts), and the layout.
export function dynamicUrl(
	origin: string,
	query: ValueQuery,
	overrides: BadgeOverrides,
	layout: Layout
): string {
	const params = new URLSearchParams()
	for (const [name, key] of PARAMS) {
		const value = overrides[key]
		if (value !== undefined) params.set(name, String(value))
	}
	params.set("layout", layout)
	return `${origin}${valuePath(query)}?${params}`
}

// HTML for a README, like renderSnippet but for a live value: the image
// points at the dynamic route, so it keeps following the repository or
// package. The value is not known here, so the alt text is the label.
export function renderDynamicSnippet(
	query: ValueQuery,
	overrides: BadgeOverrides,
	{ origin, breakpoint }: DynamicSnippetOptions
): string {
	const narrow = escapeXml(
		dynamicUrl(origin, query, overrides, narrowFor(query))
	)
	const full = escapeXml(dynamicUrl(origin, query, overrides, "full"))
	const alt = escapeXml(
		overrides.label === undefined || overrides.label === ""
			? metricLabel(query)
			: overrides.label
	)
	return [
		"<picture>",
		`  <source media="(max-width: ${breakpoint}px)" srcset="${narrow}">`,
		`  <img src="${full}" alt="${alt}">`,
		"</picture>",
		""
	].join("\n")
}
