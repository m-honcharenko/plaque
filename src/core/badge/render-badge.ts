import { getIcon, iconPath } from "../icons/icons.js"
import { colorHex, type BadgeConfig } from "./badge-config.js"
import type { Layout } from "./badge-options.js"
import {
	layout,
	type IconPlacement,
	type Section,
	type TextPlacement
} from "./layout.js"

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

// The label side follows the reader's system theme; the value side has its
// own color and white content.
const STYLE =
	":root{--fg:#1f2328;--chip:#f6f8fa}" +
	"@media (prefers-color-scheme:dark){:root{--fg:#e6edf3;--chip:#161b22}}" +
	'text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}' +
	".chip{fill:var(--chip)}.fg{fill:var(--fg)}.on{fill:#fff}"

// No float noise in the output: 18.5, not 18.500000000000004.
function n(value: number): string {
	return String(Number(value.toFixed(2)))
}

function renderIcon(placement: IconPlacement, className: string): string {
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

function renderSection(section: Section, valueColor: string): string {
	const { box, icon, text, role } = section
	const isLabel = role === "label"
	const fill = isLabel ? 'class="chip"' : `fill="#${valueColor}"`
	const ink = isLabel ? "fg" : "on"

	let svg = `<rect ${fill} x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}"/>`
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
	const body = sections
		.map((section) => renderSection(section, colorHex(config.color)))
		.join("")

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${description}">` +
		`<title>${description}</title>` +
		`<style>${STYLE}</style>` +
		`<defs><clipPath id="clip"><rect width="${w}" height="${h}" rx="${RADIUS}"/></clipPath></defs>` +
		`<g clip-path="url(#clip)">${body}</g>` +
		"</svg>"
	)
}
