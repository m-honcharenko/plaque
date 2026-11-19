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
			normalizeConfig({ label: "<b>", value: "ok", color: "#000" })
		)
		expect(svg.startsWith("<svg")).toBe(true)
		expect(svg).not.toContain("<b>")
		expect(svg).toContain("&lt;b&gt;")
	})
})
