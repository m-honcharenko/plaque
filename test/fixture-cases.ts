import type { BadgeInput } from "../src/core/badge/badge-config.js"
import type { Layout } from "../src/core/badge/badge-options.js"

const STATUS: BadgeInput = {
	label: "build",
	value: "passing",
	icon: "workflow"
}
const DATA: BadgeInput = {
	label: "release",
	value: "v2.4.1",
	icon: "tag",
	color: "info"
}

// Each reference fixture and the badge that has to reproduce it.
export const FIXTURE_CASES: {
	file: string
	input: BadgeInput
	variant: Layout
}[] = [
	{ file: "status-full.svg", input: STATUS, variant: "full" },
	{ file: "status-compact.svg", input: STATUS, variant: "compact" },
	{ file: "data-full.svg", input: DATA, variant: "full" },
	{ file: "data-vertical.svg", input: DATA, variant: "vertical" }
]
