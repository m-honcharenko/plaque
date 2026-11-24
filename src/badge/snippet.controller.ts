import { Controller, Get, Header, Query, Req } from "@nestjs/common"
import {
	ApiBadRequestResponse,
	ApiOkResponse,
	ApiOperation,
	ApiProduces,
	ApiTags
} from "@nestjs/swagger"
import type { FastifyRequest } from "fastify"

import { normalizeConfig } from "../core/badge/badge-config.js"
import { DEFAULT_BREAKPOINT, renderSnippet } from "../core/badge/snippet.js"
import { SnippetQueryDto } from "./dto/snippet-query.dto.js"
import { originOf } from "./origin.js"

@ApiTags("badge")
@Controller("snippet")
export class SnippetController {
	@Get()
	@Header("Content-Type", "text/plain; charset=utf-8")
	@Header("Cache-Control", "public, max-age=300")
	@ApiOperation({
		summary: "HTML for a README that adapts the badge to the screen width"
	})
	@ApiProduces("text/plain")
	@ApiOkResponse({
		description:
			"A <picture> with a narrow source and a full-size <img> fallback.",
		content: { "text/plain": { schema: { type: "string" } } }
	})
	@ApiBadRequestResponse({ description: "Invalid params." })
	get(
		@Query() { breakpoint, ...input }: SnippetQueryDto,
		@Req() request: FastifyRequest
	): string {
		return renderSnippet(normalizeConfig(input), {
			origin: originOf(request),
			breakpoint: breakpoint ?? DEFAULT_BREAKPOINT
		})
	}
}
