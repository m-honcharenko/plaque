export const DEFAULT_CACHE_SIZE = 1000

// How many badges to keep in memory. 0 turns the cache off, which the
// benchmark uses to measure what the cache gives.
export function cacheSizeFromEnv(
	env: Record<string, string | undefined>
): number {
	const raw = env.BADGE_CACHE_SIZE
	if (raw === undefined || raw === "") return DEFAULT_CACHE_SIZE
	const size = Number(raw)
	if (!Number.isInteger(size) || size < 0) {
		throw new RangeError(
			`BADGE_CACHE_SIZE must be a non-negative integer, got "${raw}"`
		)
	}
	return size
}
