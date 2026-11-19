import { Controller, Get, Header, Query, UseFilters } from "@nestjs/common"

import { BadgeErrorFilter } from "./badge-error.filter.js"
import { BadgeService } from "./badge.service.js"
import { BadgeQueryDto } from "./dto/badge-query.dto.js"

@Controller("badge")
@UseFilters(BadgeErrorFilter)
export class BadgeController {
	constructor(private readonly badges: BadgeService) {}

	@Get()
	@Header("Content-Type", "image/svg+xml; charset=utf-8")
	@Header("Cache-Control", "public, max-age=300")
	get(@Query() query: BadgeQueryDto): string {
		return this.badges.render(query)
	}
}
