import { describe, expect, it } from "bun:test"

import {
	ValueError,
	type GithubMetric,
	type ProvidedValue,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import { RateLimited, type FetchLike } from "./fetch-json.js"
import {
	GITHUB_PAUSE,
	GithubProvider,
	githubJsonGetter
} from "./github-provider.js"

function query(metric: GithubMetric): ValueQuery {
	return { source: "github", metric, owner: "octocat", repo: "Hello-World" }
}

function providerAnswering(body: unknown) {
	const asked: URL[] = []
	const provider = new GithubProvider(async (url) => {
		asked.push(url)
		return body
	})
	return { provider, asked }
}

async function failure(promise: Promise<unknown>): Promise<unknown> {
	return promise.then(
		() => undefined,
		(caught: unknown) => caught
	)
}

describe("GithubProvider: stars", () => {
	it("shows the count in short form", async () => {
		const { provider, asked } = providerAnswering({ stargazers_count: 12_345 })
		expect(await provider.fetch(query("stars"))).toEqual({
			label: "stars",
			value: "12k",
			color: "info",
			icon: "star"
		})
		expect(asked.map((url) => url.href)).toEqual([
			"https://api.github.com/repos/octocat/Hello-World"
		])
	})

	it("shows a small count as it is, and zero", async () => {
		const small = providerAnswering({ stargazers_count: 42 })
		expect((await small.provider.fetch(query("stars"))).value).toBe("42")
		const zero = providerAnswering({ stargazers_count: 0 })
		expect((await zero.provider.fetch(query("stars"))).value).toBe("0")
	})

	it.each([
		["no count", {}],
		["a string", { stargazers_count: "5" }],
		["a negative number", { stargazers_count: -1 }],
		["a fraction", { stargazers_count: 1.5 }],
		["infinity", { stargazers_count: Infinity }],
		["null", null],
		["an array", []]
	])("rejects an answer with %s", async (_name, body) => {
		const { provider } = providerAnswering(body)
		const error = await failure(provider.fetch(query("stars")))
		expect(error).toBeInstanceOf(ValueError)
		expect((error as ValueError).reason).toBe("unavailable")
	})
})

describe("GithubProvider: release", () => {
	it("shows the tag of the latest release", async () => {
		const { provider, asked } = providerAnswering({ tag_name: "v1.4.2" })
		expect(await provider.fetch(query("release"))).toEqual({
			label: "release",
			value: "v1.4.2",
			color: "info",
			icon: "tag"
		})
		expect(asked[0]?.href).toBe(
			"https://api.github.com/repos/octocat/Hello-World/releases/latest"
		)
	})

	it.each(["1.0.0", "release-2024.1", "@scope/pkg@1.0.0", "v2.0.0-rc.1+b5"])(
		"keeps the tag %s",
		async (tag) => {
			const { provider } = providerAnswering({ tag_name: tag })
			expect((await provider.fetch(query("release"))).value).toBe(tag)
		}
	)

	it.each([
		["no tag", {}],
		["a number", { tag_name: 1 }],
		["an empty tag", { tag_name: "" }],
		["markup", { tag_name: "<b>1</b>" }],
		["a space", { tag_name: "v 1" }],
		["a very long tag", { tag_name: "v".repeat(65) }]
	])("rejects an answer with %s", async (_name, body) => {
		const { provider } = providerAnswering(body)
		const error = await failure(provider.fetch(query("release")))
		expect((error as ValueError).reason).toBe("unavailable")
	})

	it("passes not_found on: a repository without releases", async () => {
		const provider = new GithubProvider(async () => {
			throw new ValueError("not_found")
		})
		const error = await failure(provider.fetch(query("release")))
		expect((error as ValueError).reason).toBe("not_found")
	})
})

describe("GithubProvider: license", () => {
	it("shows the SPDX id", async () => {
		const { provider } = providerAnswering({
			license: { spdx_id: "Apache-2.0", name: "Apache License 2.0" }
		})
		expect(await provider.fetch(query("license"))).toEqual({
			label: "license",
			value: "Apache-2.0",
			color: "neutral",
			icon: "law"
		})
	})

	it("says none for a repository without a license", async () => {
		const { provider } = providerAnswering({ license: null })
		expect((await provider.fetch(query("license"))).value).toBe("none")
	})

	it.each([
		["NOASSERTION", { spdx_id: "NOASSERTION" }],
		["no id", { name: "Custom" }],
		["an id with markup", { spdx_id: "<b>" }],
		["a number", { spdx_id: 5 }]
	])("says other for %s", async (_name, license) => {
		const { provider } = providerAnswering({ license })
		expect((await provider.fetch(query("license"))).value).toBe("other")
	})

	it("rejects an answer with no license field at all", async () => {
		const { provider } = providerAnswering({ name: "x" })
		const error = await failure(provider.fetch(query("license")))
		expect((error as ValueError).reason).toBe("unavailable")
	})
})

describe("GithubProvider: ci", () => {
	const run = (status: string, conclusion: string | null) => ({
		total_count: 1,
		workflow_runs: [{ status, conclusion }]
	})

	it("asks for the latest run", async () => {
		const { provider, asked } = providerAnswering(run("completed", "success"))
		await provider.fetch(query("ci"))
		expect(asked[0]?.href).toBe(
			"https://api.github.com/repos/octocat/Hello-World/actions/runs?per_page=1&exclude_pull_requests=true"
		)
	})

	it.each([
		["completed", "success", "passing", "success"],
		["completed", "neutral", "passing", "success"],
		["completed", "failure", "failing", "error"],
		["completed", "timed_out", "failing", "error"],
		["completed", "startup_failure", "failing", "error"],
		["completed", "cancelled", "cancelled", "neutral"],
		["completed", "skipped", "skipped", "neutral"],
		["completed", "action_required", "pending", "neutral"],
		["in_progress", null, "running", "warning"],
		["queued", null, "pending", "neutral"],
		["waiting", null, "pending", "neutral"]
	])("%s / %s is %s", async (status, conclusion, value, color) => {
		const { provider } = providerAnswering(run(status, conclusion))
		expect(await provider.fetch(query("ci"))).toEqual({
			label: "build",
			value,
			color,
			icon: "workflow"
		} as ProvidedValue)
	})

	it("says no runs for a repository without workflow runs", async () => {
		const { provider } = providerAnswering({
			total_count: 0,
			workflow_runs: []
		})
		expect(await provider.fetch(query("ci"))).toEqual({
			label: "build",
			value: "no runs",
			color: "neutral",
			icon: "workflow"
		})
	})

	it.each([
		["no runs list", {}],
		["runs that are not a list", { workflow_runs: "x" }],
		["a run that is not an object", { workflow_runs: [1] }],
		["an unknown status", run("exploding", null)],
		["an unknown conclusion", run("completed", "mystery")],
		["a completed run without a conclusion", run("completed", null)]
	])("rejects an answer with %s", async (_name, body) => {
		const { provider } = providerAnswering(body)
		const error = await failure(provider.fetch(query("ci")))
		expect((error as ValueError).reason).toBe("unavailable")
	})
})

describe("GithubProvider: guards", () => {
	it("only answers GitHub queries", async () => {
		const { provider, asked } = providerAnswering({})
		const error = await failure(
			provider.fetch({ source: "npm", metric: "version", name: "react" })
		)
		expect(error).toBeInstanceOf(RangeError)
		expect(asked).toHaveLength(0)
	})

	it("refuses a bad name before asking", async () => {
		const { provider, asked } = providerAnswering({})
		const error = await failure(
			provider.fetch({
				source: "github",
				metric: "stars",
				owner: "..",
				repo: "x"
			})
		)
		expect(error).toBeInstanceOf(RangeError)
		expect(asked).toHaveLength(0)
	})
})

describe("GithubProvider: rate limit", () => {
	function limited(retryAfterMs: number) {
		const clock = { now: 1_000_000 }
		let calls = 0
		let answer: "limited" | "ok" = "limited"
		const provider = new GithubProvider(
			async () => {
				calls += 1
				if (answer === "limited") throw new RateLimited(retryAfterMs)
				return { stargazers_count: 3 }
			},
			() => clock.now
		)
		return {
			provider,
			clock,
			calls: () => calls,
			recover: () => {
				answer = "ok"
			}
		}
	}

	it("stops asking GitHub until the pause is over", async () => {
		const setup = limited(120_000)
		const first = await failure(setup.provider.fetch(query("stars")))
		expect(first).toBeInstanceOf(RateLimited)
		expect(setup.calls()).toBe(1)

		setup.clock.now += 60_000
		setup.recover()
		const during = await failure(setup.provider.fetch(query("ci")))
		expect((during as ValueError).reason).toBe("unavailable")
		expect(setup.calls()).toBe(1)

		setup.clock.now += 60_000
		expect((await setup.provider.fetch(query("stars"))).value).toBe("3")
		expect(setup.calls()).toBe(2)
	})

	it("pauses for at least the minimum", async () => {
		const setup = limited(1000)
		await failure(setup.provider.fetch(query("stars")))
		setup.clock.now += GITHUB_PAUSE.minMs - 1
		await failure(setup.provider.fetch(query("stars")))
		expect(setup.calls()).toBe(1)
		setup.clock.now += 1
		setup.recover()
		await setup.provider.fetch(query("stars"))
		expect(setup.calls()).toBe(2)
	})

	it("pauses for at most the maximum", async () => {
		const setup = limited(24 * 60 * 60_000)
		await failure(setup.provider.fetch(query("stars")))
		setup.clock.now += GITHUB_PAUSE.maxMs
		setup.recover()
		await setup.provider.fetch(query("stars"))
		expect(setup.calls()).toBe(2)
	})

	it("does not pause for other failures", async () => {
		let calls = 0
		const provider = new GithubProvider(async () => {
			calls += 1
			throw new ValueError("unavailable")
		})
		await failure(provider.fetch(query("stars")))
		await failure(provider.fetch(query("stars")))
		expect(calls).toBe(2)
	})
})

describe("githubJsonGetter", () => {
	function capture() {
		const calls: RequestInit[] = []
		const fetch: FetchLike = async (_url, init) => {
			calls.push(init)
			return new Response("{}")
		}
		return { fetch, calls }
	}
	const URL_GH = new URL("https://api.github.com/repos/o/r")

	it("sends the GitHub headers and the token", async () => {
		const { fetch, calls } = capture()
		await githubJsonGetter("secret", fetch)(URL_GH)
		const sent = new Headers(calls[0]?.headers)
		expect(sent.get("authorization")).toBe("Bearer secret")
		expect(sent.get("accept")).toBe("application/vnd.github+json")
		expect(sent.get("x-github-api-version")).toBe("2022-11-28")
	})

	it.each([undefined, "", "   "])("sends no token for %j", async (token) => {
		const { fetch, calls } = capture()
		await githubJsonGetter(token, fetch)(URL_GH)
		expect(new Headers(calls[0]?.headers).get("authorization")).toBeNull()
	})

	it("trims the token", async () => {
		const { fetch, calls } = capture()
		await githubJsonGetter(" secret\n", fetch)(URL_GH)
		expect(new Headers(calls[0]?.headers).get("authorization")).toBe(
			"Bearer secret"
		)
	})
})
