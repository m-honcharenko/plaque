import { describe, expect, it } from "bun:test"

import {
	ValueError,
	type ProvidedValue,
	type ValueProvider,
	type ValueQuery
} from "../ports/value-provider.port.js"
import { normalizeConfig } from "./badge-config.js"
import { inputFromValue } from "./provider-input.js"
import { renderBadge } from "./render-badge.js"
import { narrowLayout } from "./value-kind.js"

const STARS: ProvidedValue = {
	label: "stars",
	value: "1.2k",
	color: "neutral",
	icon: "star"
}
const CI: ProvidedValue = {
	label: "build",
	value: "passing",
	color: "success",
	icon: "workflow"
}

// A provider that answers from a table, or fails like an upstream would.
class FakeProvider implements ValueProvider {
	readonly asked: ValueQuery[] = []

	constructor(private readonly answers: Map<string, ProvidedValue>) {}

	async fetch(query: ValueQuery): Promise<ProvidedValue> {
		this.asked.push(query)
		const key = JSON.stringify(query)
		const answer = this.answers.get(key)
		if (answer === undefined) throw new ValueError("not_found")
		return answer
	}
}

const STARS_QUERY: ValueQuery = {
	source: "github",
	metric: "stars",
	owner: "o",
	repo: "r"
}

describe("FakeProvider", () => {
	const provider = new FakeProvider(
		new Map([[JSON.stringify(STARS_QUERY), STARS]])
	)

	it("answers a known query", async () => {
		expect(await provider.fetch(STARS_QUERY)).toEqual(STARS)
		expect(provider.asked).toEqual([STARS_QUERY])
	})

	it("rejects an unknown one with a ValueError", async () => {
		const error = await provider
			.fetch({ source: "npm", metric: "version", name: "nope" })
			.catch((caught: unknown) => caught)
		expect(error).toBeInstanceOf(ValueError)
		expect((error as ValueError).reason).toBe("not_found")
	})
})

describe("ValueError", () => {
	it("carries the reason and uses it as the message by default", () => {
		const error = new ValueError("unavailable")
		expect(error.reason).toBe("unavailable")
		expect(error.message).toBe("unavailable")
		expect(error).toBeInstanceOf(Error)
		expect(new ValueError("unavailable", "timeout").message).toBe("timeout")
	})
})

describe("inputFromValue", () => {
	it("takes label, value, color and icon from the provider", () => {
		expect(inputFromValue(STARS)).toEqual({
			label: "stars",
			value: "1.2k",
			color: "neutral",
			icon: "star"
		})
	})

	it("lets the caller override label, color and icon", () => {
		const input = inputFromValue(STARS, {
			label: "fans",
			color: "info",
			icon: "heart"
		})
		expect(input).toMatchObject({
			label: "fans",
			color: "info",
			icon: "heart",
			value: "1.2k"
		})
	})

	it("keeps an empty label the caller asked for", () => {
		expect(inputFromValue(STARS, { label: "" }).label).toBe("")
	})

	it("never lets the caller change the value", () => {
		const overrides = { value: "999" } as Parameters<typeof inputFromValue>[1]
		expect(inputFromValue(STARS, overrides).value).toBe("1.2k")
	})

	it("passes the other options through", () => {
		const input = inputFromValue(STARS, { theme: "dark", textColor: "ffffff" })
		expect(input).toMatchObject({ theme: "dark", textColor: "ffffff" })
	})

	it("drops the provider icon when the caller brings an own path", () => {
		const input = inputFromValue(STARS, { iconPath: "M0 0L1 1z" })
		const config = normalizeConfig(input)
		expect(config.icon).toBeNull()
		expect(config.iconPath).toBe("M0 0L1 1z")
	})

	it("derives the value side from a label color, not from the provider", () => {
		const config = normalizeConfig(inputFromValue(CI, { labelColor: "3b73d1" }))
		expect(config.color).toEqual({ type: "hex", value: "2c569d" })
	})
})

describe("a live value as a badge", () => {
	it("makes a status compact and data vertical on narrow screens", () => {
		expect(narrowLayout(CI.value)).toBe("compact")
		expect(narrowLayout(STARS.value)).toBe("vertical")
	})

	it("renders with the provider's defaults", () => {
		const svg = renderBadge(normalizeConfig(inputFromValue(STARS)))
		expect(svg).toContain(">stars</text>")
		expect(svg).toContain(">1.2k</text>")
		expect(svg).toContain("--v:#6e7781")
	})
})
