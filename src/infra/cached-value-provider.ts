import {
	ValueError,
	type ProvidedValue,
	type ValueProvider,
	type ValueQuery
} from "../core/ports/value-provider.port.js"

export type ValueCacheOptions = {
	// A value younger than this is served as it is.
	ttlMs: number
	// After that it is still served for this long while a refresh runs in
	// the background (stale-while-revalidate).
	staleMs: number
	// How long a failure is remembered, so a missing package or a down
	// upstream is not asked again on every request.
	notFoundMs: number
	unavailableMs: number
	maxEntries: number
	now?: () => number
}

export const VALUE_CACHE_DEFAULTS = {
	ttlMs: 10 * 60_000,
	staleMs: 60 * 60_000,
	notFoundMs: 5 * 60_000,
	unavailableMs: 30_000,
	maxEntries: 1000
} as const

type Slot = {
	// The last good value and when it was fetched.
	value: ProvidedValue | null
	fetchedAt: number
	// The last failure, if the latest attempt failed.
	error: ValueError | null
	failedAt: number
}

// GitHub names are case-insensitive, so they share one entry.
export function valueKey(query: ValueQuery): string {
	if (query.source === "npm") return `npm:${query.name}`
	return `gh:${query.owner}/${query.repo}:${query.metric}`.toLowerCase()
}

// Remembers the answers of another provider: fresh for a while, then stale
// but served while one background refresh runs, and failures for a short
// time. Equal requests that arrive together share one upstream call, and
// the number of entries is capped (least recently used goes first).
export class CachedValueProvider implements ValueProvider {
	private readonly slots = new Map<string, Slot>()
	private readonly running = new Map<string, Promise<ProvidedValue>>()
	private readonly options: Required<ValueCacheOptions>

	constructor(
		private readonly inner: ValueProvider,
		options: Partial<ValueCacheOptions> = {}
	) {
		this.options = { now: Date.now, ...VALUE_CACHE_DEFAULTS, ...options }
	}

	async fetch(query: ValueQuery): Promise<ProvidedValue> {
		const key = valueKey(query)
		const slot = this.slots.get(key)
		if (slot === undefined) return this.refresh(key, query)

		this.store(key, slot)
		const now = this.options.now()
		const { value } = slot
		if (value !== null) {
			const age = now - slot.fetchedAt
			if (age < this.options.ttlMs) return value
			if (age < this.options.ttlMs + this.options.staleMs) {
				if (!this.isFailing(slot, now)) {
					this.refresh(key, query).catch(() => undefined)
				}
				return value
			}
		}
		if (slot.error !== null && this.isFailing(slot, now)) throw slot.error
		return this.refresh(key, query)
	}

	private isFailing(slot: Slot, now: number): boolean {
		if (slot.error === null) return false
		const remembered =
			slot.error.reason === "not_found"
				? this.options.notFoundMs
				: this.options.unavailableMs
		return now - slot.failedAt < remembered
	}

	// One upstream call per key at a time.
	private refresh(key: string, query: ValueQuery): Promise<ProvidedValue> {
		const existing = this.running.get(key)
		if (existing !== undefined) return existing
		const run = this.load(key, query).finally(() => this.running.delete(key))
		this.running.set(key, run)
		return run
	}

	private async load(key: string, query: ValueQuery): Promise<ProvidedValue> {
		try {
			const value = await this.inner.fetch(query)
			this.store(key, {
				value,
				fetchedAt: this.options.now(),
				error: null,
				failedAt: 0
			})
			return value
		} catch (caught) {
			const error =
				caught instanceof ValueError
					? caught
					: new ValueError("unavailable", "Unexpected provider failure")
			const previous = this.slots.get(key)
			this.store(key, {
				value: previous?.value ?? null,
				fetchedAt: previous?.fetchedAt ?? 0,
				error,
				failedAt: this.options.now()
			})
			throw error
		}
	}

	// Puts the entry last, so the first one is always the least recently used.
	private store(key: string, slot: Slot): void {
		this.slots.delete(key)
		this.slots.set(key, slot)
		while (this.slots.size > this.options.maxEntries) {
			const oldest = this.slots.keys().next()
			if (oldest.done) break
			this.slots.delete(oldest.value)
		}
	}
}
