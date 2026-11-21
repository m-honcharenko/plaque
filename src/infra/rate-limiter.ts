export const RATE_LIMITER = Symbol("RATE_LIMITER")

export type RateLimiterOptions = {
	// Requests allowed per client in one window.
	limit: number
	windowMs: number
	// How many clients to remember at once.
	maxKeys?: number
	// For tests.
	now?: () => number
}

export type RateDecision =
	| { allowed: true }
	| { allowed: false; retryAfterSeconds: number }

type Window = { count: number; resetAt: number }

const DEFAULT_MAX_KEYS = 10_000

function assertPositiveInt(name: string, value: number): void {
	if (!Number.isInteger(value) || value < 1) {
		throw new RangeError(`${name} must be a positive integer, got ${value}`)
	}
}

// A fixed window per client, kept in memory. A client can send up to twice
// the limit around a window edge; for badges that is fine. There are no
// timers: old windows are dropped when the table is full, so the memory
// stays bounded even if every request comes from a new address.
export class RateLimiter {
	private readonly windows = new Map<string, Window>()
	private readonly limit: number
	private readonly windowMs: number
	private readonly maxKeys: number
	private readonly now: () => number

	constructor(options: RateLimiterOptions) {
		this.limit = options.limit
		this.windowMs = options.windowMs
		this.maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS
		this.now = options.now ?? Date.now
		assertPositiveInt("limit", this.limit)
		assertPositiveInt("windowMs", this.windowMs)
		assertPositiveInt("maxKeys", this.maxKeys)
	}

	get size(): number {
		return this.windows.size
	}

	hit(key: string): RateDecision {
		const now = this.now()
		const current = this.windows.get(key)
		if (current === undefined || now >= current.resetAt) {
			this.windows.delete(key)
			this.windows.set(key, { count: 1, resetAt: now + this.windowMs })
			this.trim(now)
			return { allowed: true }
		}
		if (current.count >= this.limit) {
			const retryAfterSeconds = Math.max(
				1,
				Math.ceil((current.resetAt - now) / 1000)
			)
			return { allowed: false, retryAfterSeconds }
		}
		current.count++
		return { allowed: true }
	}

	// Called only when a window opens. Expired windows go first; if every
	// window is still live, the one opened longest ago goes.
	private trim(now: number): void {
		if (this.windows.size <= this.maxKeys) return
		for (const [key, window] of this.windows) {
			if (now >= window.resetAt) this.windows.delete(key)
		}
		while (this.windows.size > this.maxKeys) {
			const oldest = this.windows.keys().next().value
			if (oldest === undefined) return
			this.windows.delete(oldest)
		}
	}
}
