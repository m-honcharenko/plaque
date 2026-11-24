import type { NarrowLayout } from "../badge/snippet.js"
import {
	GITHUB_METRICS,
	type GithubMetric,
	type ValueQuery
} from "../ports/value-provider.port.js"
import { parseGithubRepo, parseNpmName } from "./names.js"

// A query from the parts of a request path, or null when any part is not
// valid. This is where text of a request turns into something safe to fetch.
export function githubQuery(
	owner: string,
	repo: string,
	metric: string
): ValueQuery | null {
	if (!(GITHUB_METRICS as readonly string[]).includes(metric)) return null
	if (parseGithubRepo(owner, repo) === null) return null
	return { source: "github", metric: metric as GithubMetric, owner, repo }
}

export function npmQuery(name: string): ValueQuery | null {
	if (parseNpmName(name) === null) return null
	return { source: "npm", metric: "version", name }
}

// The path of the route that renders this query. The slash of a scoped npm
// name is escaped, so the name stays one path segment.
export function valuePath(query: ValueQuery): string {
	if (query.source === "npm") {
		const name = encodeURIComponent(query.name).replace(/^%40/, "@")
		return `/npm/${name}/version`
	}
	return `/gh/${query.owner}/${query.repo}/${query.metric}`
}

// What the badge of this query is called, and what its error badges say.
export function metricLabel(query: ValueQuery): string {
	if (query.source === "npm") return "npm"
	switch (query.metric) {
		case "stars":
			return "stars"
		case "ci":
			return "build"
		case "release":
			return "release"
		case "license":
			return "license"
	}
}

// The narrow layout of a README snippet. The value is not known when the
// snippet is made, so the metric decides: CI is a status, the rest is data.
export function narrowFor(query: ValueQuery): NarrowLayout {
	return query.source === "github" && query.metric === "ci"
		? "compact"
		: "vertical"
}
