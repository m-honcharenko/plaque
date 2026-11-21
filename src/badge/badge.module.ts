import { Module } from "@nestjs/common"

import { BADGE_CACHE } from "../core/ports/badge-cache.port.js"
import { LruBadgeCache } from "../infra/lru-badge-cache.js"
import { BadgeController } from "./badge.controller.js"
import { BadgeService } from "./badge.service.js"
import { SnippetController } from "./snippet.controller.js"

@Module({
	controllers: [BadgeController, SnippetController],
	providers: [
		BadgeService,
		{ provide: BADGE_CACHE, useFactory: () => new LruBadgeCache(1000) }
	]
})
export class BadgeModule {}
