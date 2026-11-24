import {
	Controller,
	Get,
	Header,
	Param,
	Query,
	Req,
	applyDecorators
} from "@nestjs/common"
import {
	ApiBadRequestResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiProduces,
	ApiTags
} from "@nestjs/swagger"
import type { FastifyRequest } from "fastify"

import { renderDynamicSnippet } from "../core/badge/dynamic-snippet.js"
import { DEFAULT_BREAKPOINT } from "../core/badge/snippet.js"
import {
	GITHUB_METRICS,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import { DynamicSnippetQueryDto } from "./dto/dynamic-query.dto.js"
import { githubQueryOr400, npmQueryOr400 } from "./dynamic-params.js"
import { originOf } from "./origin.js"

function snippetDocs(summary: string) {
	return applyDecorators(
		Header("Content-Type", "text/plain; charset=utf-8"),
		Header("Cache-Control", "public, max-age=300"),
		ApiOperation({
			summary,
			description:
				"The image keeps following the repository or package: it points at the live badge route, not at a fixed value."
		}),
		ApiProduces("text/plain"),
		ApiOkResponse({
			description:
				"A <picture> with a narrow source and a full-size <img> fallback.",
			content: { "text/plain": { schema: { type: "string" } } }
		}),
		ApiBadRequestResponse({ description: "Invalid name or params." })
	)
}

@ApiTags("live badge")
@Controller("snippet")
export class DynamicSnippetController {
	@Get("gh/:owner/:repo/:metric")
	@snippetDocs("HTML for a README with a live GitHub badge")
	@ApiParam({ name: "owner", example: "oven-sh" })
	@ApiParam({ name: "repo", example: "bun" })
	@ApiParam({ name: "metric", enum: GITHUB_METRICS })
	github(
		@Param("owner") owner: string,
		@Param("repo") repo: string,
		@Param("metric") metric: string,
		@Query() query: DynamicSnippetQueryDto,
		@Req() request: FastifyRequest
	): string {
		return this.render(githubQueryOr400(owner, repo, metric), query, request)
	}

	@Get("npm/:name/version")
	@snippetDocs("HTML for a README with a live npm version badge")
	@ApiParam({ name: "name", example: "react" })
	npm(
		@Param("name") name: string,
		@Query() query: DynamicSnippetQueryDto,
		@Req() request: FastifyRequest
	): string {
		return this.render(npmQueryOr400(name), query, request)
	}

	@Get("npm/:scope/:name/version")
	@snippetDocs("HTML for a README with a live badge of a scoped npm package")
	@ApiParam({ name: "scope", example: "@types" })
	@ApiParam({ name: "name", example: "node" })
	npmScoped(
		@Param("scope") scope: string,
		@Param("name") name: string,
		@Query() query: DynamicSnippetQueryDto,
		@Req() request: FastifyRequest
	): string {
		return this.render(npmQueryOr400(scope, name), query, request)
	}

	private render(
		valueQuery: ValueQuery,
		{ breakpoint, ...overrides }: DynamicSnippetQueryDto,
		request: FastifyRequest
	): string {
		return renderDynamicSnippet(valueQuery, overrides, {
			origin: originOf(request),
			breakpoint: breakpoint ?? DEFAULT_BREAKPOINT
		})
	}
}
