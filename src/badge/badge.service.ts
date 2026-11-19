import { Inject, Injectable } from "@nestjs/common"

import {
	configKey,
	normalizeConfig,
	type BadgeConfig
} from "../core/badge/badge-config.js"
import { renderBadge } from "../core/badge/render-badge.js"
import { BADGE_CACHE, type BadgeCache } from "../core/ports/badge-cache.port.js"

@Injectable()
export class BadgeService {
	constructor(@Inject(BADGE_CACHE) private readonly cache: BadgeCache) {}

	render(input: Partial<BadgeConfig>): string {
		const config = normalizeConfig(input)
		const key = configKey(config)
		const cached = this.cache.get(key)
		if (cached !== undefined) return cached
		const svg = renderBadge(config)
		this.cache.set(key, svg)
		return svg
	}
}
