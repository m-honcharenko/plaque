import { CUSTOM_ICON_SIZE } from "../icons/custom-icon.js"
import { getIcon, iconPath } from "../icons/icons.js"
import type { BadgeConfig } from "./badge-config.js"
import type { Layout } from "./badge-options.js"
import {
	layout,
	type IconPlacement,
	type Section,
	type TextPlacement
} from "./layout.js"
import { themeVariables } from "./theme.js"

// Characters that are not allowed in XML 1.0 at all: even escaped they
// make the whole SVG unparsable, so they are dropped, not escaped.
const INVALID_XML_CHARS =
	// oxlint-disable-next-line no-control-regex
	/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

export function escapeXml(text: string): string {
	return text
		.replace(INVALID_XML_CHARS, "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;")
}

const RADIUS = 6

// Colors come from the CSS variables of the theme (see theme.ts): the label
// side uses --chip and --fg, the value side its own color --v and white.
const RULES =
	'text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}' +
	".chip{fill:var(--chip)}.fg{fill:var(--fg)}.val{fill:var(--v)}.on{fill:#fff}"

// No float noise in the output: 18.5, not 18.500000000000004.
function n(value: number): string {
	return String(Number(value.toFixed(2)))
}

function renderIcon(placement: IconPlacement, className: string): string {
	if (placement.d !== undefined) {
		// A nested <svg> clips to its box, so a custom path cannot draw over
		// the text next to it. `d` was checked to hold path commands only.
		return `<svg x="${n(placement.x)}" y="${n(placement.y)}" width="${placement.size}" height="${placement.size}" viewBox="0 0 ${CUSTOM_ICON_SIZE} ${CUSTOM_ICON_SIZE}"><path class="${className}" d="${placement.d}"/></svg>`
	}
	const icon = getIcon(placement.name)
	if (icon === undefined) {
		throw new RangeError(`Unknown icon: ${placement.name}`)
	}
	const scale = Number((placement.size / icon.size).toFixed(4))
	return `<g transform="translate(${n(placement.x)} ${n(placement.y)}) scale(${scale})">${iconPath(icon, className)}</g>`
}

function renderText(placement: TextPlacement, className: string): string {
	const anchor = placement.anchor === "middle" ? ' text-anchor="middle"' : ""
	const weight =
		placement.weight === 400 ? "" : ` font-weight="${placement.weight}"`
	return `<text class="${className}" x="${n(placement.x)}" y="${n(placement.y)}"${anchor} font-size="${placement.size}"${weight} textLength="${placement.width}" lengthAdjust="spacingAndGlyphs">${escapeXml(placement.text)}</text>`
}

function renderSection(section: Section): string {
	const { box, icon, text, role } = section
	const isLabel = role === "label"
	const fill = isLabel ? "chip" : "val"
	const ink = isLabel ? "fg" : "on"

	let svg = `<rect class="${fill}" x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}"/>`
	if (icon !== null) svg += renderIcon(icon, ink)
	if (text !== null) svg += renderText(text, ink)
	return svg
}

// One SVG for one layout variant. The composition (which sections and
// parts exist) is decided by layout(), never by @media inside the SVG:
// the picture a reader sees at a given width is chosen by <picture>.
export function renderBadge(
	config: BadgeConfig,
	variant: Layout = config.layout
): string {
	const { width, height, sections } = layout(config, variant)
	const w = n(width)
	const h = n(height)
	const description = escapeXml(
		config.label === "" ? config.value : `${config.label}: ${config.value}`
	)
	const body = sections.map(renderSection).join("")
	const style = themeVariables(config.theme, config.color) + RULES

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${description}">` +
		`<title>${description}</title>` +
		`<style>${style}</style>` +
		`<defs><clipPath id="clip"><rect width="${w}" height="${h}" rx="${RADIUS}"/></clipPath></defs>` +
		`<g clip-path="url(#clip)">${body}</g>` +
		"</svg>"
	)
}
