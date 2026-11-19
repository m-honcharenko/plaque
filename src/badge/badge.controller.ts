import { Controller, Get, Header, Query } from "@nestjs/common"

import { BadgeService } from "./badge.service.js"
import { BadgeQueryDto } from "./dto/badge-query.dto.js"

@Controller("badge")
export class BadgeController {
	constructor(private readonly badges: BadgeService) {}

	@Get()
	@Header("Content-Type", "image/svg+xml; charset=utf-8")
	@Header("Cache-Control", "public, max-age=300")
	get(@Query() query: BadgeQueryDto): string {
		return this.badges.render(query)
	}
}
