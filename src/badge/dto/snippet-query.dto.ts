import { ApiPropertyOptional, OmitType } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsInt, IsOptional, Max, Min } from "class-validator"

import {
	BREAKPOINT_RANGE,
	DEFAULT_BREAKPOINT
} from "../../core/badge/snippet.js"
import { BadgeQueryDto } from "./badge-query.dto.js"

// The snippet picks the layouts itself, so it takes no layout param.
export class SnippetQueryDto extends OmitType(BadgeQueryDto, ["layout"]) {
	@ApiPropertyOptional({
		description: "Viewport width in px below which the narrow layout is shown.",
		minimum: BREAKPOINT_RANGE.min,
		maximum: BREAKPOINT_RANGE.max,
		default: DEFAULT_BREAKPOINT
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(BREAKPOINT_RANGE.min)
	@Max(BREAKPOINT_RANGE.max)
	breakpoint?: number
}
