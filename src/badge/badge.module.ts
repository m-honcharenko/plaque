import { Module } from "@nestjs/common"

import { BADGE_CACHE } from "../core/ports/badge-cache.port.js"
import { LruBadgeCache } from "../infra/lru-badge-cache.js"
import { BadgeController } from "./badge.controller.js"
import { BadgeService } from "./badge.service.js"

@Module({
	controllers: [BadgeController],
	providers: [
		BadgeService,
		{ provide: BADGE_CACHE, useFactory: () => new LruBadgeCache(1000) }
	]
})
export class BadgeModule {}
