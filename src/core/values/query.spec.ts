import { describe, expect, it } from "bun:test"

import { GITHUB_METRICS } from "../ports/value-provider.port.js"
import {
	githubQuery,
	metricLabel,
	narrowFor,
	npmQuery,
	valuePath
} from "./query.js"

describe("githubQuery", () => {
	it.each(GITHUB_METRICS)("accepts the metric %s", (metric) => {
		expect(githubQuery("octocat", "Hello-World", metric)).toEqual({
			source: "github",
			metric,
			owner: "octocat",
			repo: "Hello-World"
		})
	})

	it.each([
		["an unknown metric", "octocat", "repo", "forks"],
		["an empty metric", "octocat", "repo", ""],
		["a metric in another case", "octocat", "repo", "Stars"],
		["a bad owner", "-octocat", "repo", "stars"],
		["a bad repo", "octocat", "..", "stars"],
		["a repo with a slash", "octocat", "a/b", "stars"],
		["an empty owner", "", "repo", "stars"]
	])("refuses %s", (_name, owner, repo, metric) => {
		expect(githubQuery(owner, repo, metric)).toBeNull()
	})

	it("does not take prototype names for metrics", () => {
		expect(githubQuery("o", "r", "constructor")).toBeNull()
		expect(githubQuery("o", "r", "__proto__")).toBeNull()
	})
})

describe("npmQuery", () => {
	it.each(["react", "@types/node", "left-pad"])("accepts %s", (name) => {
		expect(npmQuery(name)).toEqual({ source: "npm", metric: "version", name })
	})

	it.each(["", "../x", "a/b", "@scope", "a b", "x".repeat(215)])(
		"refuses %j",
		(name) => {
			expect(npmQuery(name)).toBeNull()
		}
	)
})

describe("valuePath", () => {
	it("makes the GitHub path", () => {
		expect(
			valuePath({ source: "github", metric: "ci", owner: "o", repo: "r.js" })
		).toBe("/gh/o/r.js/ci")
	})

	it("makes the npm path, escaping the slash of a scope", () => {
		expect(valuePath({ source: "npm", metric: "version", name: "react" })).toBe(
			"/npm/react/version"
		)
		expect(
			valuePath({ source: "npm", metric: "version", name: "@types/node" })
		).toBe("/npm/@types%2Fnode/version")
	})
})

describe("metricLabel", () => {
	it.each([
		["stars", "stars"],
		["ci", "build"],
		["release", "release"],
		["license", "license"]
	] as const)("calls %s %s", (metric, label) => {
		expect(
			metricLabel({ source: "github", metric, owner: "o", repo: "r" })
		).toBe(label)
	})

	it("calls an npm version npm", () => {
		expect(metricLabel({ source: "npm", metric: "version", name: "x" })).toBe(
			"npm"
		)
	})
})

describe("narrowFor", () => {
	it("makes CI compact and everything else vertical", () => {
		const github = (metric: "stars" | "ci" | "release" | "license") =>
			narrowFor({ source: "github", metric, owner: "o", repo: "r" })
		expect(github("ci")).toBe("compact")
		expect(github("stars")).toBe("vertical")
		expect(github("release")).toBe("vertical")
		expect(github("license")).toBe("vertical")
		expect(narrowFor({ source: "npm", metric: "version", name: "x" })).toBe(
			"vertical"
		)
	})
})
