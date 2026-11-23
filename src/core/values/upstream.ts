import type { ValueQuery } from "../ports/value-provider.port.js"
import { parseValueQuery } from "./names.js"

// The only hosts Plaque ever talks to when it fetches a live value.
export const UPSTREAM_HOSTS = ["api.github.com", "registry.npmjs.org"] as const

// https, one of the hosts above, the default port and no credentials in the
// URL. `https://api.github.com@evil.example` has the host evil.example and
// fails here.
export function isAllowedUpstream(url: URL): boolean {
	return (
		url.protocol === "https:" &&
		(UPSTREAM_HOSTS as readonly string[]).includes(url.hostname) &&
		url.port === "" &&
		url.username === "" &&
		url.password === ""
	)
}

function address(query: ValueQuery): string {
	if (query.source === "npm") {
		// A scoped name has a slash that the registry wants escaped.
		return `https://registry.npmjs.org/${query.name.replace("/", "%2F")}/latest`
	}
	const repo = `https://api.github.com/repos/${query.owner}/${query.repo}`
	switch (query.metric) {
		case "stars":
		case "license":
			return repo
		case "release":
			return `${repo}/releases/latest`
		case "ci":
			return `${repo}/actions/runs?per_page=1&exclude_pull_requests=true`
	}
}

// The one place a fetch address is made: from a checked query, never from
// text of the request. Throws when the names or the host are not allowed.
export function upstreamUrl(query: ValueQuery): URL {
	if (parseValueQuery(query) === null) {
		throw new RangeError("Invalid value query")
	}
	const url = new URL(address(query))
	if (!isAllowedUpstream(url)) {
		throw new RangeError("Upstream host is not allowed")
	}
	return url
}
