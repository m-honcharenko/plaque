import { describe, expect, it } from "bun:test"

import { normalizeConfig } from "./badge-config.js"
import { escapeXml, renderBadge } from "./render-badge.js"

describe("core/badge", () => {
	it("escapes XML special characters", () => {
		expect(escapeXml(`<a href="x">&'`)).toBe(
			"&lt;a href=&quot;x&quot;&gt;&amp;&apos;"
		)
	})

	it("renders an svg with escaped user input", () => {
		const svg = renderBadge(
			normalizeConfig({ label: "<b>", value: "ok", color: "000000" })
		)
		expect(svg.startsWith("<svg")).toBe(true)
		expect(svg).not.toContain("<b>")
		expect(svg).toContain("&lt;b&gt;")
	})
})

const PAYLOADS = [
	"</svg><script>x</script>",
	'" onload="alert(1)',
	"' onload='alert(1)",
	"<img src=x onerror=alert(1)>",
	"&lt;b&gt; &amp; &#x3C;",
	"]]></text><text>",
	"<!-- -->",
	"<?xml?>"
]

const tagCount = (svg: string) => (svg.match(/</g) ?? []).length

describe("core/badge injection", () => {
	const benign = renderBadge(normalizeConfig({ label: "a", value: "b" }))

	it.each(PAYLOADS)("keeps markup intact for %s", (payload) => {
		for (const config of [
			{ label: payload, value: "ok" },
			{ value: payload },
			{ label: payload, value: payload }
		]) {
			const svg = renderBadge(normalizeConfig(config))
			// No new tags or comments appeared, only escaped text.
			expect(tagCount(svg)).toBe(tagCount(benign))
			// The aria-label attribute was not broken out of.
			expect(svg).toMatch(/^<svg [^>]*aria-label="[^"<]*"[^>]*>/)
			expect(svg).not.toContain("<script")
			expect(svg).not.toContain('onload="')
		}
	})

	it("escapes ampersands exactly once", () => {
		const svg = renderBadge(normalizeConfig({ value: "&lt;" }))
		expect(svg).toContain("&amp;lt;")
	})

	it("drops characters that are invalid in XML", () => {
		expect(escapeXml("a\u0000b\u0001c\u001Fd\uFFFEe")).toBe("abcde")
		const svg = renderBadge(normalizeConfig({ value: "a\u0001b" }))
		expect(svg).toContain("ab")
		expect(svg).not.toContain("\u0001")
	})

	it("keeps tab, newline and non-ASCII text", () => {
		expect(escapeXml("a\tb\nc ✓ é 日本")).toBe("a\tb\nc ✓ é 日本")
	})
})
