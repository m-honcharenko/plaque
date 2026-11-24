import {
	Controller,
	Get,
	Headers,
	Param,
	Query,
	Res,
	UseFilters,
	UseGuards,
	applyDecorators
} from "@nestjs/common"
import {
	ApiBadRequestResponse,
	ApiHeader,
	ApiNotModifiedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiProduces,
	ApiTags,
	ApiTooManyRequestsResponse
} from "@nestjs/swagger"
import type { FastifyReply } from "fastify"

import { GITHUB_METRICS } from "../core/ports/value-provider.port.js"
import { BadgeErrorFilter } from "./badge-error.filter.js"
import { BadgeRateLimitFilter } from "./badge-rate-limit.filter.js"
import { DynamicQueryDto } from "./dto/dynamic-query.dto.js"
import { DynamicBadgeService } from "./dynamic-badge.service.js"
import { githubQueryOr400, npmQueryOr400 } from "./dynamic-params.js"
import { RateLimitGuard } from "./rate-limit.guard.js"
import { sendSvg } from "./svg-reply.js"

const SVG_SCHEMA = { type: "string", format: "xml" } as const

// What every live badge route answers, for the docs.
function liveBadgeDocs(summary: string, description: string) {
	return applyDecorators(
		ApiOperation({ summary, description }),
		ApiProduces("image/svg+xml"),
		ApiHeader({
			name: "If-None-Match",
			required: false,
			description: "An ETag from an earlier response; a match answers 304."
		}),
		ApiOkResponse({
			description:
				'The badge. When the repository or package does not exist, or GitHub or npm cannot be reached, the status is still 200 and the badge reads "not found" or "unavailable": GitHub\'s image proxy turns any other status into a broken image.',
			content: { "image/svg+xml": { schema: SVG_SCHEMA } }
		}),
		ApiNotModifiedResponse({ description: "The client's copy is current." }),
		ApiBadRequestResponse({
			description:
				'Invalid name or params. The body is a badge reading "error: invalid params".',
			content: { "image/svg+xml": { schema: SVG_SCHEMA } }
		}),
		ApiTooManyRequestsResponse({
			description:
				'Too many requests from one client. The body is a badge reading "error: rate limited".',
			content: { "image/svg+xml": { schema: SVG_SCHEMA } }
		})
	)
}

@ApiTags("live badge")
@Controller()
@UseGuards(RateLimitGuard)
@UseFilters(BadgeErrorFilter, BadgeRateLimitFilter)
export class DynamicBadgeController {
	constructor(private readonly badges: DynamicBadgeService) {}

	@Get("gh/:owner/:repo/:metric")
	@liveBadgeDocs(
		"A badge of a GitHub repository",
		"Stars, the latest release, the license or the state of the latest CI run. The label, colors, icon and theme can be overridden with the params of /badge."
	)
	@ApiParam({ name: "owner", example: "oven-sh" })
	@ApiParam({ name: "repo", example: "bun" })
	@ApiParam({ name: "metric", enum: GITHUB_METRICS })
	async github(
		@Param("owner") owner: string,
		@Param("repo") repo: string,
		@Param("metric") metric: string,
		@Query() query: DynamicQueryDto,
		@Headers("if-none-match") ifNoneMatch: string | undefined,
		@Res() reply: FastifyReply
	): Promise<FastifyReply> {
		const { svg, cacheControl } = await this.badges.render(
			githubQueryOr400(owner, repo, metric),
			query
		)
		return sendSvg(reply, svg, cacheControl, ifNoneMatch)
	}

	@Get("npm/:name/version")
	@liveBadgeDocs(
		"The latest version of an npm package",
		"A scoped name works with the slash escaped (@types%2Fnode) or as /npm/@types/node/version."
	)
	@ApiParam({ name: "name", example: "react" })
	async npm(
		@Param("name") name: string,
		@Query() query: DynamicQueryDto,
		@Headers("if-none-match") ifNoneMatch: string | undefined,
		@Res() reply: FastifyReply
	): Promise<FastifyReply> {
		const { svg, cacheControl } = await this.badges.render(
			npmQueryOr400(name),
			query
		)
		return sendSvg(reply, svg, cacheControl, ifNoneMatch)
	}

	@Get("npm/:scope/:name/version")
	@liveBadgeDocs(
		"The latest version of a scoped npm package",
		"The same as /npm/@scope%2Fname/version."
	)
	@ApiParam({ name: "scope", example: "@types" })
	@ApiParam({ name: "name", example: "node" })
	async npmScoped(
		@Param("scope") scope: string,
		@Param("name") name: string,
		@Query() query: DynamicQueryDto,
		@Headers("if-none-match") ifNoneMatch: string | undefined,
		@Res() reply: FastifyReply
	): Promise<FastifyReply> {
		const { svg, cacheControl } = await this.badges.render(
			npmQueryOr400(scope, name),
			query
		)
		return sendSvg(reply, svg, cacheControl, ifNoneMatch)
	}
}
