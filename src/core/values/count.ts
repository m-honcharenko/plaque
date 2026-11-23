const UNITS = [
	{ from: 1_000_000_000, suffix: "B" },
	{ from: 1_000_000, suffix: "M" },
	{ from: 1000, suffix: "k" }
] as const

// A count for a badge: 999, 1.2k, 15k, 1.2M. Rounds down, so a number never
// shows more than it is (1999 is 1.9k, not 2k). Takes a whole number >= 0.
export function formatCount(count: number): string {
	for (const { from, suffix } of UNITS) {
		if (count < from) continue
		const tenths = Math.floor(count / (from / 10))
		const whole = Math.floor(tenths / 10)
		const fraction = tenths % 10
		return whole < 10 && fraction !== 0
			? `${whole}.${fraction}${suffix}`
			: `${whole}${suffix}`
	}
	return String(count)
}
