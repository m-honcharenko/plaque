import { describe, expect, it } from "bun:test"

import {
	GITHUB_METRICS,
	type ValueQuery
} from "../ports/value-provider.port.js"
import { isAllowedUpstream, upstreamUrl, UPSTREAM_HOSTS } from "./upstream.js"

const github = (
	metric: (typeof GITHUB_METRICS)[number],
	owner = "octocat",
	repo = "Hello-World"
): ValueQuery => ({ source: "github", metric, owner, repo })

describe("upstreamUrl", () => {
	it("builds the GitHub addresses", () => {
		const base = "https://api.github.com/repos/octocat/Hello-World"
		expect(upstreamUrl(github("stars")).href).toBe(base)
		expect(upstreamUrl(github("license")).href).toBe(base)
		expect(upstreamUrl(github("release")).href).toBe(`${base}/releases/latest`)
		expect(upstreamUrl(github("ci")).href).toBe(
			`${base}/actions/runs?per_page=1&exclude_pull_requests=true`
		)
	})

	it("builds the npm addresses, escaping the slash of a scope", () => {
		expect(
			upstreamUrl({ source: "npm", metric: "version", name: "react" }).href
		).toBe("https://registry.npmjs.org/react/latest")
		expect(
			upstreamUrl({ source: "npm", metric: "version", name: "@types/node" })
				.href
		).toBe("https://registry.npmjs.org/@types%2Fnode/latest")
	})

	it("only ever points at an allowed host", () => {
		const queries: ValueQuery[] = [
			...GITHUB_METRICS.map((metric) => github(metric)),
			{ source: "npm", metric: "version", name: "@scope/pkg" }
		]
		for (const query of queries) {
			expect(isAllowedUpstream(upstreamUrl(query))).toBe(true)
		}
	})

	it.each([
		["a path climbing up", github("stars", "octocat", "..")],
		["a slash in the repo", github("stars", "octocat", "a/b")],
		["a query in the repo", github("release", "octocat", "r?x=1")],
		["a host in the owner", github("stars", "evil.example#", "r")],
		["credentials in the owner", github("stars", "u:p@evil.example", "r")],
		["an empty owner", github("ci", "", "r")]
	])("throws for %s", (_name, query) => {
		expect(() => upstreamUrl(query)).toThrow(RangeError)
	})

	it.each(["../x", "a/b/c", "name?x", "", "@scope"])(
		"throws for the npm name %j",
		(name) => {
			expect(() =>
				upstreamUrl({ source: "npm", metric: "version", name })
			).toThrow(RangeError)
		}
	)
})

describe("isAllowedUpstream", () => {
	it.each(UPSTREAM_HOSTS)("accepts https://%s", (host) => {
		expect(isAllowedUpstream(new URL(`https://${host}/x`))).toBe(true)
	})

	it.each([
		"http://api.github.com/x",
		"https://api.github.com.evil.example/x",
		"https://evil-api.github.com/x",
		"https://github.com/x",
		"https://registry.npmjs.org.evil.example/x",
		"https://api.github.com@evil.example/x",
		"https://user:pass@api.github.com/x",
		"https://api.github.com:8443/x",
		"https://127.0.0.1/x",
		"https://localhost/x",
		"https://[::1]/x",
		"ftp://api.github.com/x"
	])("refuses %s", (url) => {
		expect(isAllowedUpstream(new URL(url))).toBe(false)
	})

	it("treats the default port as no port", () => {
		expect(isAllowedUpstream(new URL("https://api.github.com:443/x"))).toBe(
			true
		)
	})
})
