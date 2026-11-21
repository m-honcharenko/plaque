export const RATE_LIMIT_DEFAULTS = { limit: 300, windowMs: 60_000 } as const

export type RateLimit = { limit: number; windowMs: number }

function positiveInt(name: string, raw: string | undefined, fallback: number) {
	if (raw === undefined || raw === "") return fallback
	const value = Number(raw)
	if (!Number.isInteger(value) || value < 1) {
		throw new RangeError(`${name} must be a positive integer, got "${raw}"`)
	}
	return value
}

// Requests per client per window. A bad value stops the start instead of
// silently turning the limit off.
export function rateLimitFromEnv(
	env: Record<string, string | undefined>
): RateLimit {
	return {
		limit: positiveInt(
			"RATE_LIMIT_MAX",
			env.RATE_LIMIT_MAX,
			RATE_LIMIT_DEFAULTS.limit
		),
		windowMs: positiveInt(
			"RATE_LIMIT_WINDOW_MS",
			env.RATE_LIMIT_WINDOW_MS,
			RATE_LIMIT_DEFAULTS.windowMs
		)
	}
}
