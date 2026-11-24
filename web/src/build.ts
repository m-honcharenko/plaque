import {
	normalizeConfig,
	type BadgeInput
} from "../../src/core/badge/badge-config.js"
import {
	dynamicUrl,
	renderDynamicSnippet
} from "../../src/core/badge/dynamic-snippet.js"
import type { BadgeOverrides } from "../../src/core/badge/provider-input.js"
import {
	badgeUrl,
	renderSnippet,
	type NarrowLayout
} from "../../src/core/badge/snippet.js"
import type { ValueQuery } from "../../src/core/ports/value-provider.port.js"
import {
	githubQuery,
	metricLabel,
	narrowFor,
	npmQuery
} from "../../src/core/values/query.js"
import {
	checkCommon,
	colorParam,
	validate,
	type BuilderState,
	type Errors
} from "./builder-state.js"

// What the preview and the code box need, whichever kind of badge it is.
export type Ready = {
	ok: true
	// A live badge follows GitHub or npm; a typed one never changes.
	live: boolean
	breakpoint: number
	narrow: NarrowLayout
	// The images of the preview, served by the page's own service.
	wideUrl: string
	narrowUrl: string
	alt: string
	// The HTML for the README, pointing at the service the form names.
	snippet: string
}

export type Result = Ready | { ok: false; errors: Errors }

// "https://github.com/owner/repo/" and "owner/repo.git" both work, because
// that is what people paste.
function parseRepo(raw: string): { owner: string; repo: string } | null {
	const text = raw
		.trim()
		.replace(/^https?:\/\/(www\.)?github\.com\//i, "")
		.replace(/\/+$/, "")
		.replace(/\.git$/i, "")
	const parts = text.split("/")
	if (parts.length !== 2) return null
	return { owner: parts[0] ?? "", repo: parts[1] ?? "" }
}

function liveQuery(state: BuilderState): ValueQuery | null {
	if (state.source === "npm") return npmQuery(state.pkg.trim())
	const parsed = parseRepo(state.repo)
	if (parsed === null) return null
	return githubQuery(parsed.owner, parsed.repo, state.metric)
}

function put<K extends keyof BadgeOverrides>(
	key: K,
	value: BadgeOverrides[K] | undefined
): BadgeOverrides {
	return value === undefined ? {} : { [key]: value }
}

// Only what the person set: the rest comes from the metric.
export function overridesOf(state: BuilderState): BadgeOverrides {
	const custom = state.iconSource === "custom" && state.customPath !== null
	const library = state.iconSource === "library" && state.icon !== null
	return {
		...(state.label === "" ? {} : { label: state.label }),
		...put("color", colorParam(state.valueColor)),
		...put("labelColor", colorParam(state.labelColor)),
		...put("textColor", state.textColor ?? undefined),
		...put("iconColor", state.iconColor ?? undefined),
		...put("icon", library ? (state.icon ?? undefined) : undefined),
		...put("iconPath", custom ? (state.customPath ?? undefined) : undefined),
		...put(
			"iconStroke",
			custom ? (state.customStroke ?? undefined) : undefined
		),
		...put("theme", state.theme === "auto" ? undefined : state.theme)
	}
}

function buildTyped(state: BuilderState, previewOrigin: string): Result {
	const checked = validate(state)
	if (!checked.ok) return checked
	const { config, breakpoint, narrow, origin } = checked
	return {
		ok: true,
		live: false,
		breakpoint,
		narrow,
		wideUrl: badgeUrl(previewOrigin, config, "full"),
		narrowUrl: badgeUrl(previewOrigin, config, narrow),
		alt: `${config.label} ${config.value}`,
		snippet: renderSnippet(config, { origin, breakpoint, narrow })
	}
}

function buildLive(state: BuilderState, previewOrigin: string): Result {
	const { errors, origin } = checkCommon(state)
	const query = liveQuery(state)
	if (query === null) {
		if (state.source === "npm") {
			errors.pkg = "Not a valid npm package name"
		} else {
			errors.repo = "Use owner/repo, for example oven-sh/bun"
		}
	}
	const overrides = overridesOf(state)
	if (Object.keys(errors).length === 0) {
		try {
			// The service checks the same things when it renders the badge.
			const input: BadgeInput = { ...overrides, value: "0" }
			normalizeConfig(input)
		} catch {
			errors.icon = "This icon is not accepted"
		}
	}
	if (query === null || origin === null || Object.keys(errors).length > 0) {
		return { ok: false, errors }
	}
	const narrow = narrowFor(query)
	const breakpoint = state.breakpoint
	const alt = state.label === "" ? metricLabel(query) : state.label
	return {
		ok: true,
		live: true,
		breakpoint,
		narrow,
		wideUrl: dynamicUrl(previewOrigin, query, overrides, "full"),
		narrowUrl: dynamicUrl(previewOrigin, query, overrides, narrow),
		alt,
		snippet: renderDynamicSnippet(query, overrides, { origin, breakpoint })
	}
}

// Everything the screen shows comes from here: the form state in, the
// preview URLs and the README code out, or the problems to fix.
export function build(state: BuilderState, previewOrigin: string): Result {
	return state.source === "static"
		? buildTyped(state, previewOrigin)
		: buildLive(state, previewOrigin)
}
