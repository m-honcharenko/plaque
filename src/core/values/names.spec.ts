import { describe, expect, it } from "bun:test"

import { parseGithubRepo, parseNpmName, parseValueQuery } from "./names.js"

describe("parseGithubRepo", () => {
	it.each([
		["octocat", "Hello-World"],
		["a", "b"],
		["m-honcharenko", "plaque"],
		["user1", ".github"],
		["user", "my.repo_name-2"],
		["a".repeat(39), "r"],
		["o", "r".repeat(100)]
	])("accepts %s/%s", (owner, repo) => {
		expect(parseGithubRepo(owner, repo)).toEqual({ owner, repo })
	})

	it.each([
		["", "repo"],
		["owner", ""],
		["-owner", "repo"],
		["owner-", "repo"],
		["ow--ner", "repo"],
		["ow_ner", "repo"],
		["ow.ner", "repo"],
		["a".repeat(40), "repo"],
		["owner", "r".repeat(101)],
		["owner", "."],
		["owner", ".."],
		["owner", "../x"],
		["owner/x", "repo"],
		["owner", "re/po"],
		["owner", "re po"],
		["owner", "repo?x=1"],
		["owner", "repo#frag"],
		["owner", "re%2Fpo"],
		["owner", "repo\n"],
		["owner\n", "repo"],
		["owner", "repo@host"],
		["owner", "repo\\x"],
		["ownér", "repo"],
		["owner", "répo"],
		["evil.example#", "repo"],
		["user:pass@evil.example", "repo"]
	])("rejects %j/%j", (owner, repo) => {
		expect(parseGithubRepo(owner, repo)).toBeNull()
	})
})

describe("parseNpmName", () => {
	it.each([
		"react",
		"left-pad",
		"lodash.merge",
		"@types/node",
		"@scope/some-pkg",
		"JSONStream",
		"a",
		"~tilde",
		"a".repeat(214)
	])("accepts %s", (name) => {
		expect(parseNpmName(name)).toBe(name)
	})

	it.each([
		"",
		".hidden",
		"_private",
		"a".repeat(215),
		"@scope",
		"@/name",
		"@scope/",
		"@scope/a/b",
		"scope/name",
		"@@scope/name",
		"name with space",
		"name\n",
		"na%2Fme",
		"name?x=1",
		"name#x",
		"../x",
		"..",
		"a/../b",
		"name@1.0.0",
		"@scope/.hidden",
		"na\\me",
		"näme"
	])("rejects %j", (name) => {
		expect(parseNpmName(name)).toBeNull()
	})
})

describe("parseValueQuery", () => {
	it("returns a valid query unchanged", () => {
		const github = {
			source: "github",
			metric: "stars",
			owner: "o",
			repo: "r"
		} as const
		const npm = { source: "npm", metric: "version", name: "react" } as const
		expect(parseValueQuery(github)).toBe(github)
		expect(parseValueQuery(npm)).toBe(npm)
	})

	it("returns null when a name is bad", () => {
		expect(
			parseValueQuery({
				source: "github",
				metric: "ci",
				owner: "o",
				repo: ".."
			})
		).toBeNull()
		expect(
			parseValueQuery({ source: "npm", metric: "version", name: "../x" })
		).toBeNull()
	})
})
