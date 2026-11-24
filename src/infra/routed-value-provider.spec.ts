import { describe, expect, it } from "bun:test"

import {
	GITHUB_METRICS,
	type ProvidedValue,
	type ValueProvider,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import { metricLabel } from "../core/values/query.js"
import { GithubProvider } from "./github-provider.js"
import { NpmProvider } from "./npm-provider.js"
import { RoutedValueProvider } from "./routed-value-provider.js"

function named(label: string): ValueProvider & { asked: ValueQuery[] } {
	const asked: ValueQuery[] = []
	return {
		asked,
		async fetch(query) {
			asked.push(query)
			return { label, value: "v", color: "info", icon: null }
		}
	}
}

describe("RoutedValueProvider", () => {
	it("sends each query to the provider of its source", async () => {
		const npm = named("npm")
		const github = named("github")
		const routed = new RoutedValueProvider({ npm, github })

		const fromNpm = await routed.fetch({
			source: "npm",
			metric: "version",
			name: "react"
		})
		const fromGithub = await routed.fetch({
			source: "github",
			metric: "stars",
			owner: "o",
			repo: "r"
		})

		expect(fromNpm.label).toBe("npm")
		expect(fromGithub.label).toBe("github")
		expect(npm.asked).toHaveLength(1)
		expect(github.asked).toHaveLength(1)
	})
})

// The error badges use metricLabel, the providers write their own labels.
// They must say the same words.
describe("metricLabel and the providers", () => {
	const answers: Record<string, unknown> = {
		stars: { stargazers_count: 1 },
		release: { tag_name: "v1" },
		license: { license: null },
		ci: { workflow_runs: [] }
	}

	it.each(GITHUB_METRICS)("agree on the label of %s", async (metric) => {
		const provider = new GithubProvider(async () => answers[metric])
		const query: ValueQuery = {
			source: "github",
			metric,
			owner: "o",
			repo: "r"
		}
		const value: ProvidedValue = await provider.fetch(query)
		expect(metricLabel(query)).toBe(value.label)
	})

	it("agree on the label of an npm version", async () => {
		const provider = new NpmProvider(async () => ({ version: "1.0.0" }))
		const query: ValueQuery = { source: "npm", metric: "version", name: "x" }
		expect(metricLabel(query)).toBe((await provider.fetch(query)).label)
	})
})
