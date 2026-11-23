import { describe, expect, it } from "bun:test"

import {
	ValueError,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import { NpmProvider } from "./npm-provider.js"

const REACT: ValueQuery = { source: "npm", metric: "version", name: "react" }

function providerAnswering(body: unknown) {
	const asked: URL[] = []
	const provider = new NpmProvider(async (url) => {
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

describe("NpmProvider", () => {
	it("turns the latest version into a badge value", async () => {
		const { provider, asked } = providerAnswering({
			name: "react",
			version: "19.1.0"
		})
		expect(await provider.fetch(REACT)).toEqual({
			label: "npm",
			value: "v19.1.0",
			color: "info",
			icon: "npm"
		})
		expect(asked.map((url) => url.href)).toEqual([
			"https://registry.npmjs.org/react/latest"
		])
	})

	it("asks for a scoped package with the slash escaped", async () => {
		const { provider, asked } = providerAnswering({ version: "1.0.0" })
		await provider.fetch({
			source: "npm",
			metric: "version",
			name: "@types/node"
		})
		expect(asked[0]?.href).toBe(
			"https://registry.npmjs.org/@types%2Fnode/latest"
		)
	})

	it("keeps a pre-release version", async () => {
		const { provider } = providerAnswering({ version: "2.0.0-beta.1+build.5" })
		expect((await provider.fetch(REACT)).value).toBe("v2.0.0-beta.1+build.5")
	})

	it.each([
		["no version", { name: "react" }],
		["a number", { version: 19 }],
		["an empty string", { version: "" }],
		["markup", { version: "<script>alert(1)</script>" }],
		["a newline", { version: "1.0.0\n" }],
		["a space", { version: "1.0 0" }],
		["a very long string", { version: "1".repeat(65) }],
		["an array", [{ version: "1.0.0" }]],
		["null", null],
		["a string", "1.0.0"]
	])("rejects an answer with %s", async (_name, body) => {
		const { provider } = providerAnswering(body)
		const error = await failure(provider.fetch(REACT))
		expect(error).toBeInstanceOf(ValueError)
		expect((error as ValueError).reason).toBe("unavailable")
	})

	it("passes a failure of the fetcher on", async () => {
		const provider = new NpmProvider(async () => {
			throw new ValueError("not_found")
		})
		const error = await failure(provider.fetch(REACT))
		expect((error as ValueError).reason).toBe("not_found")
	})

	it("only answers npm queries", async () => {
		const { provider, asked } = providerAnswering({ version: "1.0.0" })
		const error = await failure(
			provider.fetch({
				source: "github",
				metric: "stars",
				owner: "o",
				repo: "r"
			})
		)
		expect(error).toBeInstanceOf(RangeError)
		expect(asked).toHaveLength(0)
	})

	it("refuses a bad package name before asking", async () => {
		const { provider, asked } = providerAnswering({ version: "1.0.0" })
		const error = await failure(
			provider.fetch({ source: "npm", metric: "version", name: "../x" })
		)
		expect(error).toBeInstanceOf(RangeError)
		expect(asked).toHaveLength(0)
	})
})
