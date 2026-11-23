// Color math for badges that have their own colors: which ink (white or
// dark) reads well on a background, and which shade the value side gets
// when only the label side was chosen.

export const INK_LIGHT = "ffffff"
export const INK_DARK = "1f2328"

function channels(hex: string): [number, number, number] {
	return [
		Number.parseInt(hex.slice(0, 2), 16),
		Number.parseInt(hex.slice(2, 4), 16),
		Number.parseInt(hex.slice(4, 6), 16)
	]
}

// WCAG relative luminance, 0 (black) to 1 (white).
export function luminance(hex: string): number {
	const [r, g, b] = channels(hex).map((value) => {
		const c = value / 255
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	}) as [number, number, number]
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// White ink unless it would be hard to read (under 3:1), then the dark ink.
// Medium colors keep white, as most badges do.
export function readableInk(background: string): string {
	return 1.05 / (luminance(background) + 0.05) >= 3 ? INK_LIGHT : INK_DARK
}

function mix(hex: string, target: number, amount: number): string {
	return channels(hex)
		.map((value) =>
			Math.round(value + (target - value) * amount)
				.toString(16)
				.padStart(2, "0")
		)
		.join("")
}

// The value side next to a label color: a darker shade, or a lighter one
// when the label is already nearly black.
export function shadeOf(hex: string): string {
	return luminance(hex) < 0.08 ? mix(hex, 255, 0.2) : mix(hex, 0, 0.25)
}
