import { measure, type FontWeight } from "./measure.js"

export const ELLIPSIS = "…"

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })

// Shortens text so its estimated width stays within maxWidth, ending with
// "…". Cuts only between user-perceived characters, so an emoji sequence or
// a letter with a combining mark is never split. Text that fits is returned
// as is. When nothing but the ellipsis fits, the ellipsis alone is returned,
// so a truncated text is never empty.
export function truncateToWidth(
	text: string,
	maxWidth: number,
	size: number,
	weight: FontWeight = 400
): string {
	if (measure(text, size, weight) <= maxWidth) return text

	const room = maxWidth - measure(ELLIPSIS, size, weight)
	let used = 0
	let kept = ""
	for (const { segment } of segmenter.segment(text)) {
		const width = measure(segment, size, weight)
		if (used + width > room) break
		used += width
		kept += segment
	}
	return `${kept.trimEnd()}${ELLIPSIS}`
}
