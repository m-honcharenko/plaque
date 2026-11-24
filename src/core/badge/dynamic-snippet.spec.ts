import { describe, expect, it } from "bun:test"

import type { ValueQuery } from "../ports/value-provider.port.js"
import { dynamicUrl, renderDynamicSnippet } from "./dynamic-snippet.js"

const STARS: ValueQuery = {
	source: "github",
	metric: "stars",
	owner: "octocat",
	repo: "Hello-World"
}
const CI: ValueQuery = { ...STARS, metric: "ci" }
const SCOPED: ValueQuery = {
	source: "npm",
	metric: "version",
	name: "@types/node"
}
const OPTIONS = { origin: "https://plaque.test", breakpoint: 600 }

describe("dynamicUrl", () => {
	it("points at the route with the layout", () => {
		expect(dynamicUrl("https://p.test", STARS, {}, "full")).toBe(
			"https://p.test/gh/octocat/Hello-World/stars?layout=full"
		)
	})

	it("carries every option the caller set", () => {
		const url = new URL(
			dynamicUrl(
				"https://p.test",
				STARS,
				{
					label: "Stars",
					color: "ff0000",
					labelColor: "info",
					textColor: "ffffff",
					iconColor: "000000",
					icon: "heart",
					theme: "dark"
				},
				"vertical"
			)
		)
		expect(Object.fromEntries(url.searchParams)).toEqual({
			label: "Stars",
			color: "ff0000",
			"label-color": "info",
			"text-color": "ffffff",
			"icon-color": "000000",
			icon: "heart",
			theme: "dark",
			layout: "vertical"
		})
	})

	it("carries a custom icon and its stroke", () => {
		const url = new URL(
			dynamicUrl(
				"https://p.test",
				STARS,
				{ iconPath: "M12 2L2 22h20z", iconStroke: "2" },
				"full"
			)
		)
		expect(url.searchParams.get("icon-path")).toBe("M12 2L2 22h20z")
		expect(url.searchParams.get("icon-stroke")).toBe("2")
	})

	it("keeps an empty label, which hides the label on purpose", () => {
		const url = new URL(
			dynamicUrl("https://p.test", STARS, { label: "" }, "full")
		)
		expect(url.searchParams.get("label")).toBe("")
		expect(url.searchParams.has("label")).toBe(true)
	})

	it("leaves out what was not set and ignores a layout override", () => {
		const url = new URL(
			dynamicUrl("https://p.test", STARS, { layout: "vertical" }, "full")
		)
		expect([...url.searchParams.keys()]).toEqual(["layout"])
		expect(url.searchParams.get("layout")).toBe("full")
	})

	it("escapes the slash of a scoped npm name in the path", () => {
		expect(dynamicUrl("https://p.test", SCOPED, {}, "full")).toBe(
			"https://p.test/npm/@types%2Fnode/version?layout=full"
		)
	})
})

describe("renderDynamicSnippet", () => {
	it("makes a picture with a narrow source and an img fallback", () => {
		expect(renderDynamicSnippet(STARS, {}, OPTIONS)).toBe(
			[
				"<picture>",
				'  <source media="(max-width: 600px)" srcset="https://plaque.test/gh/octocat/Hello-World/stars?layout=vertical">',
				'  <img src="https://plaque.test/gh/octocat/Hello-World/stars?layout=full" alt="stars">',
				"</picture>",
				""
			].join("\n")
		)
	})

	it("picks compact for CI and vertical for data", () => {
		expect(renderDynamicSnippet(CI, {}, OPTIONS)).toContain("layout=compact")
		expect(renderDynamicSnippet(STARS, {}, OPTIONS)).toContain(
			"layout=vertical"
		)
		expect(renderDynamicSnippet(SCOPED, {}, OPTIONS)).toContain(
			"layout=vertical"
		)
	})

	it("uses the breakpoint", () => {
		expect(
			renderDynamicSnippet(STARS, {}, { ...OPTIONS, breakpoint: 480 })
		).toContain("(max-width: 480px)")
	})

	it("uses the label of the caller as the alt text", () => {
		const html = renderDynamicSnippet(STARS, { label: "Our stars" }, OPTIONS)
		expect(html).toContain('alt="Our stars"')
	})

	it("falls back to the metric label for an empty label", () => {
		expect(renderDynamicSnippet(CI, { label: "" }, OPTIONS)).toContain(
			'alt="build"'
		)
	})

	it("escapes the ampersands and quotes of the attributes", () => {
		const html = renderDynamicSnippet(
			STARS,
			{ label: 'a"b<c', color: "ff0000" },
			OPTIONS
		)
		expect(html).toContain("&amp;")
		expect(html).not.toContain('a"b')
		expect(html).not.toContain("<c")
		expect(html).toContain('alt="a&quot;b&lt;c"')
	})
})
