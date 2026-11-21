import type { BadgeCache } from "../core/ports/badge-cache.port.js"

// A cache that keeps nothing: every badge is rendered again.
export class NullBadgeCache implements BadgeCache {
	get(_key: string): undefined {
		return undefined
	}

	set(_key: string, _svg: string): void {}
}
