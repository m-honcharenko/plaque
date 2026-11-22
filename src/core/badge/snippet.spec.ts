import { describe, expect, it } from "bun:test"

import { normalizeConfig, type BadgeInput } from "./badge-config.js"
import { badgeUrl, renderSnippet, type SnippetOptions } from "./snippet.js"

const ORIGIN = "https://plaque.example"
const OPTIONS: SnippetOptions = { origin: ORIGIN, breakpoint: 600 }

function snippetOf(input: BadgeInput, options = OPTIONS): string {
	return renderSnippet(normalizeConfig(input), options)
}

function urls(snippet: string): { narrow: string; full: string } {
	const narrow = snippet.match(/srcset="([^"]+)"/)?.[1]
	const full = snippet.match(/<img src="([^"]+)"/)?.[1]
	if (narrow === undefined || full === undefined) throw new Error("no urls")
	const decode = (url: string) => url.replaceAll("&amp;", "&")
	return { narrow: decode(narrow), full: decode(full) }
}

describe("renderSnippet", () => {
	it("serves a status as an icon on narrow screens", () => {
		const snippet = snippetOf({ label: "build", value: "passing" })
		expect(snippet).toBe(
			[
				"<picture>",
				'  <source media="(max-width: 600px)" srcset="https://plaque.example/badge?label=build&amp;value=passing&amp;color=success&amp;theme=auto&amp;layout=compact">',
				'  <img src="https://plaque.example/badge?label=build&amp;value=passing&amp;color=success&amp;theme=auto&amp;layout=full" alt="build: passing">',
				"</picture>",
				""
			].join("\n")
		)
	})

	it("serves data as the vertical layout on narrow screens", () => {
		const { narrow, full } = urls(
			snippetOf({ label: "release", value: "v2.4.1" })
		)
		expect(new URL(narrow).searchParams.get("layout")).toBe("vertical")
		expect(new URL(full).searchParams.get("layout")).toBe("full")
	})

	it("lets the caller force the narrow layout", () => {
		const status = urls(
			snippetOf({ value: "passing" }, { ...OPTIONS, narrow: "vertical" })
		)
		expect(new URL(status.narrow).searchParams.get("layout")).toBe("vertical")
		const data = urls(
			snippetOf({ value: "v2.4.1" }, { ...OPTIONS, narrow: "compact" })
		)
		expect(new URL(data.narrow).searchParams.get("layout")).toBe("compact")
	})

	it("puts the breakpoint into the media query", () => {
		const snippet = snippetOf({ value: "ok" }, { ...OPTIONS, breakpoint: 480 })
		expect(snippet).toContain('media="(max-width: 480px)"')
	})

	it("ignores the layout asked for in the config", () => {
		const { narrow, full } = urls(
			snippetOf({ value: "ok", layout: "vertical" })
		)
		expect(new URL(narrow).searchParams.get("layout")).toBe("compact")
		expect(new URL(full).searchParams.get("layout")).toBe("full")
	})

	it("uses just the value as alt text when the label is empty", () => {
		expect(snippetOf({ value: "ok" })).toContain('alt="ok"')
	})

	it.each([
		'"><script>alert(1)</script>',
		"' onerror='x",
		"</picture><img src=x>",
		"a&b",
		"\u0000\u0001"
	])("cannot break out of an attribute: %j", (value) => {
		const snippet = snippetOf({ label: value, value })
		expect(snippet.match(/</g)?.length).toBe(4)
		expect(snippet.split('"').length - 1).toBe(8)
		expect(snippet).not.toContain("'")
	})
})

describe("badgeUrl", () => {
	it.each<BadgeInput>([
		{ label: "my label", value: "a b" },
		{ label: "a&b=c", value: "x#y?z" },
		{ label: "", value: "ünï ✓", color: "2DA44E", icon: "check" },
		{ value: "100%", theme: "dark", color: "warning" }
	])("round-trips through the query string: %j", (input) => {
		const config = normalizeConfig(input)
		const params = new URL(badgeUrl(ORIGIN, config, "compact")).searchParams
		const back = normalizeConfig({
			label: params.get("label") ?? undefined,
			value: params.get("value") ?? "",
			color: params.get("color") ?? undefined,
			icon: params.get("icon") ?? undefined,
			theme: params.get("theme") as BadgeInput["theme"],
			layout: params.get("layout") as BadgeInput["layout"]
		})
		expect(back).toEqual({ ...config, layout: "compact" })
	})
})
