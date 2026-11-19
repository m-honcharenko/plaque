export interface BadgeCache {
	get(key: string): string | undefined
	set(key: string, svg: string): void
}

export const BADGE_CACHE = Symbol("BADGE_CACHE")
