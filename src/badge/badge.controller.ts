import {
	Controller,
	Get,
	Headers,
	Query,
	Res,
	UseFilters
} from "@nestjs/common"
import {
	ApiBadRequestResponse,
	ApiHeader,
	ApiNotModifiedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiProduces,
	ApiTags
} from "@nestjs/swagger"
import type { FastifyReply } from "fastify"

import { BadgeErrorFilter } from "./badge-error.filter.js"
import { BadgeService } from "./badge.service.js"
import { BadgeQueryDto } from "./dto/badge-query.dto.js"
import { etagOf, matchesEtag } from "./etag.js"

const SVG_SCHEMA = { type: "string", format: "xml" } as const
const CACHE_CONTROL = "public, max-age=300"

@ApiTags("badge")
@Controller("badge")
@UseFilters(BadgeErrorFilter)
export class BadgeController {
	constructor(private readonly badges: BadgeService) {}

	@Get()
	@ApiOperation({ summary: "Render a badge as SVG" })
	@ApiProduces("image/svg+xml")
	@ApiHeader({
		name: "If-None-Match",
		required: false,
		description: "An ETag from an earlier response; a match answers 304."
	})
	@ApiOkResponse({
		description: "The badge. Has an ETag and is gzipped when the client asks.",
		content: { "image/svg+xml": { schema: SVG_SCHEMA } }
	})
	@ApiNotModifiedResponse({ description: "The client's copy is current." })
	@ApiBadRequestResponse({
		description:
			'Invalid params. The body is a badge reading "error: invalid params".',
		content: { "image/svg+xml": { schema: SVG_SCHEMA } }
	})
	get(
		@Query() query: BadgeQueryDto,
		@Headers("if-none-match") ifNoneMatch: string | undefined,
		@Res() reply: FastifyReply
	): FastifyReply {
		const svg = this.badges.render(query)
		const etag = etagOf(svg)
		reply.header("ETag", etag).header("Cache-Control", CACHE_CONTROL)
		if (matchesEtag(ifNoneMatch, etag)) return reply.status(304).send()
		return reply
			.header("Content-Type", "image/svg+xml; charset=utf-8")
			.send(svg)
	}
}
