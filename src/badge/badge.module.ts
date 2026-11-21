import { Module } from "@nestjs/common"
import { ThrottlerModule } from "@nestjs/throttler"

import { BADGE_CACHE } from "../core/ports/badge-cache.port.js"
import { LruBadgeCache } from "../infra/lru-badge-cache.js"
import { rateLimitFromEnv } from "../rate-limit.js"
import { BadgeController } from "./badge.controller.js"
import { BadgeService } from "./badge.service.js"
import { SnippetController } from "./snippet.controller.js"

@Module({
	imports: [
		ThrottlerModule.forRootAsync({
			useFactory: () => [rateLimitFromEnv(process.env)]
		})
	],
	controllers: [BadgeController, SnippetController],
	providers: [
		BadgeService,
		{ provide: BADGE_CACHE, useFactory: () => new LruBadgeCache(1000) }
	]
})
export class BadgeModule {}
