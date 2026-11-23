import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Expose } from "class-transformer"
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
	LAYOUTS,
	LIMITS,
	THEMES
} from "../../core/badge/badge-options.js"
import {
	ICON_PATH_MAX_LENGTH,
	ICON_STROKE_RANGE
} from "../../core/icons/custom-icon.js"
import { ICON_NAMES, type IconName } from "../../core/icons/icons.js"
import { IsIconPath, IsIconStroke } from "./is-icon-path.js"

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
		name: "label-color",
		description:
			"Background of the left (or top) side: a color token or six hex digits. Without it the side follows the theme, and without color the value side becomes a darker shade of this one.",
		example: "3b73d1",
		pattern: COLOR_PATTERN.source
	})
	@Expose({ name: "label-color" })
	@IsOptional()
	@Matches(COLOR_PATTERN, {
		message: 'label-color must be a token or six hex digits without "#"'
	})
	labelColor?: string

	@ApiPropertyOptional({
		name: "text-color",
		description:
			"Text color as six hex digits. Without it the text color is picked for contrast.",
		example: "ffffff",
		pattern: HEX_COLOR.source
	})
	@Expose({ name: "text-color" })
	@IsOptional()
	@Matches(HEX_COLOR, { message: "text-color must be six hex digits" })
	textColor?: string

	@ApiPropertyOptional({
		name: "icon-color",
		description:
			"Icon color as six hex digits. Without it the icon takes the text color.",
		example: "ffffff",
		pattern: HEX_COLOR.source
	})
	@Expose({ name: "icon-color" })
	@IsOptional()
	@Matches(HEX_COLOR, { message: "icon-color must be six hex digits" })
	iconColor?: string

	@ApiPropertyOptional({
		description:
			"Icon from the whitelist. An unknown name is an error, not a silent fallback.",
		enum: ICON_NAMES,
		example: "check"
	})
	@IsOptional()
	@IsIn(ICON_NAMES)
	icon?: IconName

	@ApiPropertyOptional({
		name: "icon-path",
		description:
			"Your own icon: one SVG path (the d attribute) on a 24x24 grid, up to 500 characters, commands M L H V C S Q T A Z only. The color comes from the theme. Cannot be combined with icon.",
		maxLength: ICON_PATH_MAX_LENGTH,
		example: "M12 2L2 22h20z"
	})
	@Expose({ name: "icon-path" })
	@IsOptional()
	@IsString()
	@MaxLength(ICON_PATH_MAX_LENGTH)
	@IsIconPath()
	iconPath?: string

	@ApiPropertyOptional({
		name: "icon-stroke",
		description:
			"Draw icon-path as an outline with this line width (in grid units, two decimals at most) instead of filling it. Needs icon-path.",
		minimum: ICON_STROKE_RANGE.min,
		maximum: ICON_STROKE_RANGE.max,
		example: "2"
	})
	@Expose({ name: "icon-stroke" })
	@IsOptional()
	@IsString()
	@IsIconStroke()
	iconStroke?: string

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
