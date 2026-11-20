import { FONT_METRICS } from "./metrics.data.js"

export type FontWeight = 400 | 600

// Advance widths in thousandths of an em, keyed by code point.
export type FontMetrics = {
	fallback: Record<FontWeight, number>
	widths: Record<FontWeight, Readonly<Record<number, number>>>
}

// Marks and joiners that take no room of their own.
function isZeroWidth(cp: number): boolean {
	return (
		(cp >= 0x0300 && cp <= 0x036f) ||
		(cp >= 0x200b && cp <= 0x200f) ||
		cp === 0x2060 ||
		(cp >= 0xfe00 && cp <= 0xfe0f) ||
		cp === 0xfeff
	)
}

// CJK, Hangul, fullwidth forms and emoji are about one em wide.
function isWide(cp: number): boolean {
	return (
		(cp >= 0x2e80 && cp <= 0x9fff) ||
		(cp >= 0xac00 && cp <= 0xd7af) ||
		(cp >= 0xf900 && cp <= 0xfaff) ||
		(cp >= 0xff00 && cp <= 0xff60) ||
		(cp >= 0xffe0 && cp <= 0xffe6) ||
		(cp >= 0x1f300 && cp <= 0x1faff) ||
		(cp >= 0x20000 && cp <= 0x2ffff)
	)
}

function unitsFor(cp: number, weight: FontWeight): number {
	const known = FONT_METRICS.widths[weight][cp]
	if (known !== undefined) return known
	if (isZeroWidth(cp)) return 0
	if (isWide(cp)) return 1000
	return FONT_METRICS.fallback[weight]
}

// Estimated width in px of a single line of text, no kerning and no
// shaping: close enough to size a badge, while textLength in the SVG
// absorbs the difference to the reader's real font. Counts code points,
// so an emoji sequence with joiners is counted piece by piece.
export function measure(
	text: string,
	size: number,
	weight: FontWeight = 400
): number {
	let units = 0
	for (const char of text) {
		units += unitsFor(char.codePointAt(0)!, weight)
	}
	return (units * size) / 1000
}
