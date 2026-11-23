import { CUSTOM_ICON_SIZE } from "../icons/custom-icon.js"
import { getIcon, iconPath } from "../icons/icons.js"
import type { BadgeConfig } from "./badge-config.js"
import type { Layout } from "./badge-options.js"
import { INK_LIGHT, readableInk } from "./colors.js"
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
	".chip{fill:var(--chip)}.fg{fill:var(--fg)}.val{fill:var(--v)}.on{fill:#fff}" +
	".lab{fill:var(--l)}" +
	".fg-line,.on-line,.line{fill:none;stroke-linecap:round;stroke-linejoin:round}" +
	".fg-line{stroke:var(--fg)}.on-line{stroke:#fff}"

// No float noise in the output: 18.5, not 18.500000000000004.
function n(value: number): string {
	return String(Number(value.toFixed(2)))
}

// What a section's text and icons are painted with: a hex color, or null
// for the class of the theme (fg on the label, white on the value).
type Ink = { text: string | null; icon: string | null }

function inkOf(config: BadgeConfig, role: "label" | "value"): Ink {
	let auto: string | null = null
	if (role === "label" && config.labelColor !== null) {
		// Tokens are tuned for white ink; a hex color gets what reads best.
		auto =
			config.labelColor.type === "hex"
				? readableInk(config.labelColor.value)
				: INK_LIGHT
	} else if (role === "value" && config.color.type === "hex") {
		const ink = readableInk(config.color.value)
		auto = ink === INK_LIGHT ? null : ink
	}
	return {
		text: config.textColor ?? auto,
		icon: config.iconColor ?? config.textColor ?? auto
	}
}

function renderIcon(
	placement: IconPlacement,
	className: string,
	color: string | null
): string {
	if (placement.d !== undefined) {
		// A nested <svg> clips to its box, so a custom path cannot draw over
		// the text next to it. `d` was checked to hold path commands only.
		// An outline is drawn with a round line of the given width instead.
		let look: string
		if (placement.stroke === undefined) {
			look = color === null ? `class="${className}"` : `fill="#${color}"`
		} else {
			const width = `stroke-width="${n(placement.stroke)}"`
			look =
				color === null
					? `class="${className}-line" ${width}`
					: `class="line" stroke="#${color}" ${width}`
		}
		return `<svg x="${n(placement.x)}" y="${n(placement.y)}" width="${placement.size}" height="${placement.size}" viewBox="0 0 ${CUSTOM_ICON_SIZE} ${CUSTOM_ICON_SIZE}"><path ${look} d="${placement.d}"/></svg>`
	}
	const icon = getIcon(placement.name)
	if (icon === undefined) {
		throw new RangeError(`Unknown icon: ${placement.name}`)
	}
	const scale = Number((placement.size / icon.size).toFixed(4))
	const path =
		color === null
			? iconPath(icon, className)
			: `<path fill="#${color}" d="${icon.d}"/>`
	return `<g transform="translate(${n(placement.x)} ${n(placement.y)}) scale(${scale})">${path}</g>`
}

function renderText(
	placement: TextPlacement,
	className: string,
	color: string | null
): string {
	const anchor = placement.anchor === "middle" ? ' text-anchor="middle"' : ""
	const weight =
		placement.weight === 400 ? "" : ` font-weight="${placement.weight}"`
	const paint = color === null ? `class="${className}"` : `fill="#${color}"`
	return `<text ${paint} x="${n(placement.x)}" y="${n(placement.y)}"${anchor} font-size="${placement.size}"${weight} textLength="${placement.width}" lengthAdjust="spacingAndGlyphs">${escapeXml(placement.text)}</text>`
}

function renderSection(section: Section, config: BadgeConfig): string {
	const { box, icon, text, role } = section
	const isLabel = role === "label"
	const fill = isLabel ? (config.labelColor === null ? "chip" : "lab") : "val"
	const ink = isLabel ? "fg" : "on"
	const paint = inkOf(config, role)

	let svg = `<rect class="${fill}" x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}"/>`
	if (icon !== null) svg += renderIcon(icon, ink, paint.icon)
	if (text !== null) svg += renderText(text, ink, paint.text)
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
	const body = sections
		.map((section) => renderSection(section, config))
		.join("")
	const style =
		themeVariables(config.theme, config.color, config.labelColor) + RULES

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${description}">` +
		`<title>${description}</title>` +
		`<style>${style}</style>` +
		`<defs><clipPath id="clip"><rect width="${w}" height="${h}" rx="${RADIUS}"/></clipPath></defs>` +
		`<g clip-path="url(#clip)">${body}</g>` +
		"</svg>"
	)
}
