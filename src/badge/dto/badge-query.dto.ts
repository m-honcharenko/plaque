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
	@IsOptional()
	@IsString()
	@MaxLength(LIMITS.label)
	label?: string

	@IsString()
	@MinLength(1)
	@MaxLength(LIMITS.value)
	@Matches(/\S/, { message: "value must not be blank" })
	value!: string

	@IsOptional()
	@Matches(COLOR_PATTERN, {
		message: 'color must be a token or six hex digits without "#"'
	})
	color?: string

	@IsOptional()
	@IsString()
	@MaxLength(LIMITS.icon)
	@Matches(ICON_NAME, { message: 'icon may contain a-z, 0-9 and "-"' })
	icon?: string

	@IsOptional()
	@IsIn(THEMES)
	theme?: (typeof THEMES)[number]

	@IsOptional()
	@IsIn(LAYOUTS)
	layout?: (typeof LAYOUTS)[number]
}
