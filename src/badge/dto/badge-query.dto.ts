import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import {
	IsIn,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength
} from "class-validator"

import {
	COLOR_TOKENS,
	HEX_COLOR,
	ICON_NAME,
	LAYOUTS,
	LIMITS,
	THEMES
} from "../../core/badge/badge-options.js"

const COLOR_PATTERN = new RegExp(
	`^(${COLOR_TOKENS.join("|")}|${HEX_COLOR.source.slice(1, -1)})$`
)

export class BadgeQueryDto {
	@ApiPropertyOptional({
		description: "Left text. Shown in the full layout only; may be empty.",
		maxLength: LIMITS.label,
		example: "build"
	})
	@IsOptional()
	@IsString()
	@MaxLength(LIMITS.label)
	label?: string

	@ApiProperty({
		description: "Right text: a status or a piece of data.",
		minLength: 1,
		maxLength: LIMITS.value,
		example: "passing"
	})
	@IsString()
	@MinLength(1)
	@MaxLength(LIMITS.value)
	@Matches(/\S/, { message: "value must not be blank" })
	value!: string

	@ApiPropertyOptional({
		description:
			'A color token or six hex digits without "#" (a "#" starts the URL fragment).',
		example: "success",
		default: "success",
		pattern: COLOR_PATTERN.source
	})
	@IsOptional()
	@Matches(COLOR_PATTERN, {
		message: 'color must be a token or six hex digits without "#"'
	})
	color?: string

	@ApiPropertyOptional({
		description: "Icon name: lowercase letters, digits and dashes.",
		maxLength: LIMITS.icon,
		pattern: ICON_NAME.source,
		example: "check"
	})
	@IsOptional()
	@IsString()
	@MaxLength(LIMITS.icon)
	@Matches(ICON_NAME, { message: 'icon may contain a-z, 0-9 and "-"' })
	icon?: string

	@ApiPropertyOptional({
		description: "Color theme. auto follows the reader's system theme.",
		enum: THEMES,
		default: "auto"
	})
	@IsOptional()
	@IsIn(THEMES)
	theme?: (typeof THEMES)[number]

	@ApiPropertyOptional({
		description: "Badge layout.",
		enum: LAYOUTS,
		default: "full"
	})
	@IsOptional()
	@IsIn(LAYOUTS)
	layout?: (typeof LAYOUTS)[number]
}
