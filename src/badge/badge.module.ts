import { Module } from "@nestjs/common"

import { cacheSizeFromEnv } from "../cache-size.js"
import { BADGE_CACHE } from "../core/ports/badge-cache.port.js"
import { LruBadgeCache } from "../infra/lru-badge-cache.js"
import { NullBadgeCache } from "../infra/null-badge-cache.js"
import { RATE_LIMITER, RateLimiter } from "../infra/rate-limiter.js"
import { rateLimitFromEnv } from "../rate-limit.js"
import { BadgeController } from "./badge.controller.js"
import { BadgeService } from "./badge.service.js"
import { RateLimitGuard } from "./rate-limit.guard.js"
import { SnippetController } from "./snippet.controller.js"

@Module({
	controllers: [BadgeController, SnippetController],
	providers: [
		BadgeService,
		RateLimitGuard,
		{
			provide: RATE_LIMITER,
			useFactory: () => new RateLimiter(rateLimitFromEnv(process.env))
		},
		{
			provide: BADGE_CACHE,
			useFactory: () => {
				const size = cacheSizeFromEnv(process.env)
				return size === 0 ? new NullBadgeCache() : new LruBadgeCache(size)
			}
		}
	]
})
export class BadgeModule {}
