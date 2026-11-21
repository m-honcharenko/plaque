import { Injectable } from "@nestjs/common"

import type { BadgeCache } from "../core/ports/badge-cache.port.js"

// Map keeps insertion order, so the first key is always the least recently
// used one: a hit moves its entry to the end.
@Injectable()
export class LruBadgeCache implements BadgeCache {
	private readonly items = new Map<string, string>()

	constructor(private readonly maxSize = 1000) {
		if (!Number.isInteger(maxSize) || maxSize < 1) {
			throw new RangeError(`Invalid cache size: ${maxSize}`)
		}
	}

	get size(): number {
		return this.items.size
	}

	get(key: string): string | undefined {
		const svg = this.items.get(key)
		if (svg !== undefined) {
			this.items.delete(key)
			this.items.set(key, svg)
		}
		return svg
	}

	set(key: string, svg: string): void {
		this.items.delete(key)
		this.items.set(key, svg)
		if (this.items.size > this.maxSize) {
			const oldest = this.items.keys().next().value
			if (oldest !== undefined) this.items.delete(oldest)
		}
	}
}
