import type { ValueQuery } from "../ports/value-provider.port.js"

// Names go into the path of a request to GitHub or npm, so only plain
// characters pass: no slash, dot-dot, percent, query, fragment, '@' tricks
// or whitespace. Every check is a whole-string match with a hard length cap.

// 1 to 39 letters, digits and single hyphens, not starting or ending with one.
const GITHUB_OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
const GITHUB_REPO = /^[A-Za-z0-9._-]{1,100}$/

// One part of an npm name: no leading dot or underscore.
const NPM_PART = "[A-Za-z0-9~-][A-Za-z0-9._~-]*"
const NPM_NAME = new RegExp(`^(?:@${NPM_PART}/)?${NPM_PART}$`)
const NPM_MAX_LENGTH = 214

export type GithubRepo = { owner: string; repo: string }

// The owner and repo as they were, or null when either is not a GitHub name.
export function parseGithubRepo(
	owner: string,
	repo: string
): GithubRepo | null {
	if (!GITHUB_OWNER.test(owner) || !GITHUB_REPO.test(repo)) return null
	if (repo === "." || repo === "..") return null
	return { owner, repo }
}

// The package name as it was ("react", "@types/node"), or null.
export function parseNpmName(name: string): string | null {
	if (name.length > NPM_MAX_LENGTH || !NPM_NAME.test(name)) return null
	return name
}

// The same query when its names are valid, null when they are not.
export function parseValueQuery(query: ValueQuery): ValueQuery | null {
	if (query.source === "npm") {
		return parseNpmName(query.name) === null ? null : query
	}
	return parseGithubRepo(query.owner, query.repo) === null ? null : query
}
