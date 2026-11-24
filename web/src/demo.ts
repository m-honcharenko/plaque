import { normalizeConfig } from "../../src/core/badge/badge-config.js"
import { dynamicUrl } from "../../src/core/badge/dynamic-snippet.js"
import { badgeUrl, DEFAULT_BREAKPOINT } from "../../src/core/badge/snippet.js"
import type { ValueQuery } from "../../src/core/ports/value-provider.port.js"
import {
	githubQuery,
	metricLabel,
	narrowFor
} from "../../src/core/values/query.js"

// The width of the demo "screen" and where it turns narrow, like the media
// query in the snippet: "max-width: 600px" includes 600.
export const DEMO_BREAKPOINT = DEFAULT_BREAKPOINT
export const DEMO_WIDTH = { min: 320, max: 900, step: 10, start: 900 } as const

export function isNarrow(
	width: number,
	breakpoint: number = DEMO_BREAKPOINT
): boolean {
	return width <= breakpoint
}

export type DemoBadge = {
	id: string
	alt: string
	wide: string
	narrow: string
}

// A well-known repository, so the live numbers are real and never "not
// found" the way a young project's release would be.
export const DEMO_REPO = { owner: "preactjs", repo: "preact" } as const
const METRICS = ["stars", "release", "license"] as const

// A status (it turns into an icon on a narrow screen) and live data (it
// stacks under its icon).
export function demoBadges(origin: string): DemoBadge[] {
	const status = normalizeConfig({
		label: "build",
		value: "passing",
		icon: "workflow"
	})
	const live = METRICS.map((metric): DemoBadge => {
		const query = githubQuery(
			DEMO_REPO.owner,
			DEMO_REPO.repo,
			metric
		) as ValueQuery
		return {
			id: metric,
			alt: metricLabel(query),
			wide: dynamicUrl(origin, query, {}, "full"),
			narrow: dynamicUrl(origin, query, {}, narrowFor(query))
		}
	})
	return [
		{
			id: "build",
			alt: "build passing",
			wide: badgeUrl(origin, status, "full"),
			narrow: badgeUrl(origin, status, "compact")
		},
		...live
	]
}
