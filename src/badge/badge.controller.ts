import { Controller, Get, Header, Query, UseFilters } from "@nestjs/common"
import {
	ApiBadRequestResponse,
	ApiOkResponse,
	ApiOperation,
	ApiProduces,
	ApiTags
} from "@nestjs/swagger"

import { BadgeErrorFilter } from "./badge-error.filter.js"
import { BadgeService } from "./badge.service.js"
import { BadgeQueryDto } from "./dto/badge-query.dto.js"

const SVG_SCHEMA = { type: "string", format: "xml" } as const

@ApiTags("badge")
@Controller("badge")
@UseFilters(BadgeErrorFilter)
export class BadgeController {
	constructor(private readonly badges: BadgeService) {}

	@Get()
	@Header("Content-Type", "image/svg+xml; charset=utf-8")
	@Header("Cache-Control", "public, max-age=300")
	@ApiOperation({ summary: "Render a badge as SVG" })
	@ApiProduces("image/svg+xml")
	@ApiOkResponse({
		description: "The badge.",
		content: { "image/svg+xml": { schema: SVG_SCHEMA } }
	})
	@ApiBadRequestResponse({
		description:
			'Invalid params. The body is a badge reading "error: invalid params".',
		content: { "image/svg+xml": { schema: SVG_SCHEMA } }
	})
	get(@Query() query: BadgeQueryDto): string {
		return this.badges.render(query)
	}
}
