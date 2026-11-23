import {
	ValueError,
	type ProvidedValue,
	type ValueProvider,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import { formatCount } from "../core/values/count.js"
import { upstreamUrl } from "../core/values/upstream.js"
import { fetchJson, RateLimited, type FetchLike } from "./fetch-json.js"
import type { JsonGetter } from "./npm-provider.js"

// How long GitHub is left alone after it said "too many requests": what it
// asked for, but not less than the first and not more than the second.
export const GITHUB_PAUSE = { minMs: 30_000, maxMs: 15 * 60_000 } as const

// A tag may be v1.2.3, release-1, or @scope/pkg@1.0.0 in a monorepo.
const TAG = /^[0-9A-Za-z@][0-9A-Za-z._+@/-]{0,63}$/
// An SPDX identifier: MIT, Apache-2.0, GPL-3.0-or-later.
const SPDX = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,39}$/

// Reads GitHub JSON. A token raises the limit from 60 to 5000 requests an
// hour; it is sent to api.github.com only (fetchJson drops it on a redirect
// to another host).
export function githubJsonGetter(
	token: string | undefined,
	fetch?: FetchLike
): JsonGetter {
	const headers: Record<string, string> = {
		accept: "application/vnd.github+json",
		"x-github-api-version": "2022-11-28"
	}
	const secret = token?.trim()
	if (secret) headers.authorization = `Bearer ${secret}`
	return (url) => fetchJson(url, { headers, ...(fetch ? { fetch } : {}) })
}

function record(body: unknown): Record<string, unknown> | null {
	return typeof body === "object" && body !== null && !Array.isArray(body)
		? (body as Record<string, unknown>)
		: null
}

function unexpected(): ValueError {
	return new ValueError("unavailable", "Unexpected answer from GitHub")
}

function stars(body: unknown): ProvidedValue {
	const count = record(body)?.stargazers_count
	if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
		throw unexpected()
	}
	return {
		label: "stars",
		value: formatCount(count),
		color: "info",
		icon: "star"
	}
}

function release(body: unknown): ProvidedValue {
	const tag = record(body)?.tag_name
	if (typeof tag !== "string" || !TAG.test(tag)) throw unexpected()
	return { label: "release", value: tag, color: "info", icon: "tag" }
}

function license(body: unknown): ProvidedValue {
	const data = record(body)
	if (data === null || !("license" in data)) throw unexpected()
	const info = data.license
	const base = { label: "license", color: "neutral", icon: "law" } as const
	// A repository without a license has null here.
	if (info === null) return { ...base, value: "none" }
	const id = record(info)?.spdx_id
	if (typeof id !== "string" || id === "NOASSERTION" || !SPDX.test(id)) {
		// "NOASSERTION" and "Other": there is a license, GitHub cannot name it.
		return { ...base, value: "other" }
	}
	return { ...base, value: id }
}

function ciState(
	status: unknown,
	conclusion: unknown
): Pick<ProvidedValue, "value" | "color"> | null {
	if (status === "completed") {
		switch (conclusion) {
			case "success":
			case "neutral":
				return { value: "passing", color: "success" }
			case "failure":
			case "timed_out":
			case "startup_failure":
				return { value: "failing", color: "error" }
			case "cancelled":
				return { value: "cancelled", color: "neutral" }
			case "skipped":
				return { value: "skipped", color: "neutral" }
			case "action_required":
			case "stale":
				return { value: "pending", color: "neutral" }
			default:
				return null
		}
	}
	switch (status) {
		case "in_progress":
			return { value: "running", color: "warning" }
		case "queued":
		case "waiting":
		case "requested":
		case "pending":
			return { value: "pending", color: "neutral" }
		default:
			return null
	}
}

// The state of the latest workflow run (any branch, no pull requests).
function ci(body: unknown): ProvidedValue {
	const runs = record(body)?.workflow_runs
	if (!Array.isArray(runs)) throw unexpected()
	const base = { label: "build", icon: "workflow" } as const
	if (runs.length === 0) {
		return { ...base, value: "no runs", color: "neutral" }
	}
	const run = record(runs[0])
	const state = ciState(run?.status, run?.conclusion)
	if (state === null) throw unexpected()
	return { ...base, ...state }
}

// Stars, latest release, license and CI state of a GitHub repository.
// After a rate limit it does not ask GitHub again until the pause is over
// and answers unavailable at once.
export class GithubProvider implements ValueProvider {
	private pausedUntil = 0

	constructor(
		private readonly getJson: JsonGetter = githubJsonGetter(undefined),
		private readonly now: () => number = Date.now
	) {}

	async fetch(query: ValueQuery): Promise<ProvidedValue> {
		if (query.source !== "github") {
			throw new RangeError("GithubProvider only answers GitHub queries")
		}
		const url = upstreamUrl(query)
		const started = this.now()
		if (started < this.pausedUntil) {
			throw new ValueError("unavailable", "GitHub rate limit, try later")
		}

		let body: unknown
		try {
			body = await this.getJson(url)
		} catch (error) {
			if (error instanceof RateLimited) {
				const wait = Math.min(
					Math.max(error.retryAfterMs, GITHUB_PAUSE.minMs),
					GITHUB_PAUSE.maxMs
				)
				this.pausedUntil = started + wait
			}
			throw error
		}

		switch (query.metric) {
			case "stars":
				return stars(body)
			case "release":
				return release(body)
			case "license":
				return license(body)
			case "ci":
				return ci(body)
		}
	}
}
