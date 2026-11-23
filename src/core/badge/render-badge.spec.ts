import { describe, expect, it } from "bun:test"

import { getIcon } from "../icons/icons.js"
import { normalizeConfig, type BadgeInput } from "./badge-config.js"
import { escapeXml, renderBadge } from "./render-badge.js"

const STATUS = normalizeConfig({
	label: "build",
	value: "passing",
	icon: "workflow"
})
const DATA = normalizeConfig({
	label: "release",
	value: "v2.4.1",
	icon: "tag",
	color: "info"
})

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

describe("core/badge/render-badge", () => {
	it("sizes each layout like its reference fixture", () => {
		expect(renderBadge(STATUS, "full")).toContain('viewBox="0 0 149 28"')
		expect(renderBadge(STATUS, "compact")).toContain('viewBox="0 0 72 28"')
		expect(renderBadge(DATA, "vertical")).toContain('viewBox="0 0 60 52"')
	})

	it("sets width and height equal to the viewBox", () => {
		const svg = renderBadge(DATA, "vertical")
		expect(svg).toContain('width="60" height="52"')
	})

	it("renders config.layout by default and lets a variant override it", () => {
		const config = normalizeConfig({ value: "ok", layout: "vertical" })
		expect(renderBadge(config)).toContain('viewBox="0 0 39 24"')
		expect(renderBadge(config, "full")).toContain('viewBox="0 0 40 28"')
	})

	it("shows the label text in full only", () => {
		expect(renderBadge(STATUS, "full")).toContain(">build</text>")
		expect(renderBadge(STATUS, "compact")).not.toContain(">build</text>")
		expect(renderBadge(DATA, "vertical")).not.toContain(">release</text>")
	})

	it("describes the badge for screen readers", () => {
		const svg = renderBadge(STATUS, "compact")
		expect(svg).toContain('aria-label="build: passing"')
		expect(svg).toContain("<title>build: passing</title>")
		expect(renderBadge(normalizeConfig({ value: "ok" }))).toContain(
			'aria-label="ok"'
		)
	})

	it("draws a whitelisted icon scaled to 16px", () => {
		const tag = getIcon("tag")
		const github = getIcon("github")
		expect(tag?.size).toBe(16)
		expect(github?.size).toBe(24)

		const small = renderBadge(normalizeConfig({ value: "ok", icon: "tag" }))
		expect(small).toContain("scale(1)")
		expect(small).toContain(`d="${tag?.d}"`)

		const big = renderBadge(normalizeConfig({ value: "ok", icon: "github" }))
		expect(big).toContain("scale(0.6667)")
		expect(big).toContain(`d="${github?.d}"`)
	})

	it("refuses an icon outside the whitelist", () => {
		expect(() => renderBadge({ ...STATUS, icon: "nope" })).toThrow(RangeError)
	})

	it("paints the value side from the color variable", () => {
		const svg = renderBadge(STATUS)
		expect(svg).toContain('class="val"')
		expect(svg).toContain("--v:#1a7f37")
		const custom = normalizeConfig({ value: "ok", color: "FF00AA" })
		expect(renderBadge(custom)).toContain("--v:#ff00aa")
	})

	it("follows the system theme in auto", () => {
		const svg = renderBadge({ ...STATUS, theme: "auto" })
		expect(svg).toContain("--v:#1a7f37")
		expect(svg).toContain("@media (prefers-color-scheme:dark)")
		expect(svg).toContain("--v:#2ea043")
	})

	it("fixes the theme in light and dark, without @media", () => {
		const light = renderBadge({ ...STATUS, theme: "light" })
		expect(light).not.toContain("@media")
		expect(light).toContain("--fg:#1f2328")
		expect(light).toContain("--v:#1a7f37")
		expect(light).not.toContain("#2ea043")

		const dark = renderBadge({ ...STATUS, theme: "dark" })
		expect(dark).not.toContain("@media")
		expect(dark).toContain("--fg:#e6edf3")
		expect(dark).toContain("--v:#2ea043")
		expect(dark).not.toContain("#1a7f37")
	})

	it("changes the composition by variant, not by @media", () => {
		for (const variant of ["full", "compact", "vertical"] as const) {
			// one @media in the file: the color scheme of the label side
			const svg = renderBadge(STATUS, variant)
			expect((svg.match(/@media/g) ?? []).length).toBe(1)
			expect(svg).toContain("prefers-color-scheme")
		}
	})

	it("prints numbers without float noise", () => {
		const svg = renderBadge(DATA, "full")
		expect(svg).not.toMatch(/\d\.\d{3,}"/)
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

// The same shapes with harmless text: the payload must change no markup.
const SHAPES: ((text: string) => BadgeInput)[] = [
	(text) => ({ label: text, value: "ok" }),
	(text) => ({ value: text }),
	(text) => ({ label: text, value: text }),
	(text) => ({ label: text, value: text, icon: "tag" })
]

const tagCount = (svg: string) => (svg.match(/</g) ?? []).length

describe("core/badge injection", () => {
	it.each(PAYLOADS)("keeps markup intact for %s", (payload) => {
		for (const shape of SHAPES) {
			for (const variant of ["full", "compact", "vertical"] as const) {
				const svg = renderBadge(normalizeConfig(shape(payload)), variant)
				const benign = renderBadge(normalizeConfig(shape("a")), variant)
				// No new tags or comments appeared, only escaped text.
				expect(tagCount(svg)).toBe(tagCount(benign))
				// The aria-label attribute was not broken out of.
				expect(svg).toMatch(/^<svg [^>]*aria-label="[^"<]*"[^>]*>/)
				expect(svg).not.toContain("<script")
				expect(svg).not.toContain('onload="')
			}
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

describe("custom icon", () => {
	const config = (extra: Partial<BadgeInput> = {}) =>
		normalizeConfig({
			label: "build",
			value: "passing",
			iconPath: "M12 2L2 22h20z",
			...extra
		})

	it("draws the path in a clipped 24x24 box", () => {
		const svg = renderBadge(config())
		expect(svg).toContain('viewBox="0 0 24 24"')
		expect(svg).toContain('d="M12 2L2 22h20z"')
		expect(svg).toContain('width="16" height="16"')
	})

	it("works in every layout", () => {
		for (const variant of ["full", "compact", "vertical"] as const) {
			expect(renderBadge(config(), variant)).toContain('d="M12 2L2 22h20z"')
		}
	})

	it("sizes the badge like a named icon", () => {
		const named = renderBadge(
			normalizeConfig({ label: "build", value: "passing", icon: "check" })
		)
		const custom = renderBadge(config())
		const width = (svg: string) => svg.match(/width="([\d.]+)"/)?.[1]
		expect(width(custom)).toBe(width(named))
	})
})
