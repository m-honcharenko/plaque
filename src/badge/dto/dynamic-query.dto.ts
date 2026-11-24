import { OmitType } from "@nestjs/swagger"

import { BadgeQueryDto } from "./badge-query.dto.js"
import { SnippetQueryDto } from "./snippet-query.dto.js"

// A live badge takes the options of /badge, minus the value: that comes
// from GitHub or npm. Label, color and icon are defaults the caller can
// override.
export class DynamicQueryDto extends OmitType(BadgeQueryDto, ["value"]) {}

export class DynamicSnippetQueryDto extends OmitType(SnippetQueryDto, [
	"value"
]) {}
