import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { ICON_NAMES, getIcon } from "../icons/icons.js"
import { normalizeConfig, type BadgeInput } from "./badge-config.js"
import { LAYOUTS, THEMES } from "./badge-options.js"
import {
	renderInvalidParamsBadge,
	renderRateLimitedBadge
} from "./error-badge.js"
import { renderBadge } from "./render-badge.js"

const ELEMENTS = new Set([
	"svg",
	"title",
	"style",
	"defs",
	"clipPath",
	"g",
	"rect",
	"path",
	"text"
])
const ATTRIBUTES = new Set([
	"xmlns",
	"width",
	"height",
	"viewBox",
	"role",
	"aria-label",
	"id",
	"rx",
	"clip-path",
	"class",
	"transform",
	"d",
	"x",
	"y",
	"text-anchor",
	"font-size",
	"font-weight",
	"textLength",
	"lengthAdjust"
])
const SVG_NAMESPACE = "http://www.w3.org/2000/svg"
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\- ]+$/
const TAG = /<\/?([A-Za-z][\w:-]*)((?:\s+[^\s=>/]+="[^"]*")*)\s*\/?>/g
const ATTRIBUTE = /\s([^\s=]+)="([^"]*)"/g

const HOSTILE = [
	'"><script>alert(1)</script>',
	"</text></g></svg><script>x</script>",
	"<foreignObject><iframe src=x>",
	"<image href=x><use href=x>",
	"javascript:alert(1)",
	"x' onload='alert(1)",
	"]]><!ENTITY x SYSTEM 'file:///etc/passwd'>",
	"&#60;script&#62; &lt; &amp;",
	`\u0000\u0008${String.fromCodePoint(0xfffe, 0xffff)}`,
	"a\nb\tc\r"
]

const TEXTS: BadgeInput[] = [
	{ label: "build", value: "passing" },
	{ label: "", value: "v2.4.1" },
	...HOSTILE.map((text) => ({ label: text, value: text }))
]
const COLORS = ["success", "warning", "error", "info", "neutral", "2da44e"]

// Every icon in every layout and theme, with texts and colors rotating
// through the matrix.
const SVGS: string[] = []
let step = 0
for (const icon of [undefined, ...ICON_NAMES]) {
	for (const layout of LAYOUTS) {
		for (const theme of THEMES) {
			const text = TEXTS[step % TEXTS.length] as BadgeInput
			const color = COLORS[step % COLORS.length]
			step++
			SVGS.push(
				renderBadge(normalizeConfig({ ...text, icon, color, theme, layout }))
			)
		}
	}
}
SVGS.push(renderInvalidParamsBadge(), renderRateLimitedBadge())

const WHITELISTED_PATHS = new Set(
	ICON_NAMES.map((name) => getIcon(name)?.d ?? "")
)

describe("generated svg", () => {
	it("covers every icon", () => {
		expect(SVGS.length).toBeGreaterThanOrEqual(ICON_NAMES.length * 9)
	})

	it("uses only whitelisted elements and attributes", () => {
		for (const svg of SVGS) {
			const tags = [...svg.matchAll(TAG)]
			// Every "<" must open a tag we parsed: user text is escaped.
			expect(svg.match(/</g)?.length).toBe(tags.length)
			for (const [, name = "", attributes = ""] of tags) {
				expect(ELEMENTS.has(name)).toBe(true)
				for (const [, attribute = ""] of attributes.matchAll(ATTRIBUTE)) {
					expect(ATTRIBUTES.has(attribute)).toBe(true)
				}
			}
		}
	})

	it("has no scripts, external resources or event handlers", () => {
		for (const svg of SVGS) {
			// The user's text legitimately shows up escaped in the label, the
			// title and the text nodes; the rest must be clean.
			const markup = svg
				.replace(/aria-label="[^"]*"/, "")
				.replace(/>[^<]*</g, "><")
			expect(markup).not.toMatch(
				/<script|foreignObject|<image|<use|<a[\s>]|<iframe|<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i
			)
			expect(markup).not.toMatch(/href|xlink|javascript:|\son\w+\s*=/i)
			const css = svg.match(/<style>([^<]*)<\/style>/)?.[1] ?? ""
			expect(css).not.toMatch(/@import|url\(|expression\(|javascript:/i)
		}
	})

	it("references nothing but its own clip path and namespace", () => {
		for (const svg of SVGS) {
			expect([...svg.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1])).toEqual([
				"#clip"
			])
			expect([...svg.matchAll(/https?:/g)]).toHaveLength(1)
			expect(svg.startsWith(`<svg xmlns="${SVG_NAMESPACE}" `)).toBe(true)
		}
	})

	it("draws icons only from whitelisted path data", () => {
		for (const svg of SVGS) {
			for (const [, attributes = ""] of svg.matchAll(/<path([^>]*)\/>/g)) {
				const d = attributes.match(/\sd="([^"]*)"/)?.[1] ?? ""
				expect(WHITELISTED_PATHS.has(d)).toBe(true)
				expect(d).toMatch(PATH_DATA)
			}
		}
	})
})

describe("generated svg is well-formed XML", () => {
	let dir = ""
	const xmllint = Bun.which("xmllint")

	beforeAll(async () => {
		dir = await mkdtemp(join(tmpdir(), "plaque-xml-"))
		await Promise.all(
			SVGS.map((svg, index) => Bun.write(join(dir, `${index}.svg`), svg))
		)
	})

	afterAll(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	// Locally a missing xmllint skips the test; in CI it must fail.
	it.skipIf(xmllint === null && !process.env.CI)(
		"passes xmllint with no network and no entities",
		async () => {
			if (xmllint === null) {
				throw new Error("xmllint not found: install libxml2-utils")
			}
			const proc = Bun.spawn(
				[
					xmllint,
					"--noout",
					"--nonet",
					...SVGS.map((_, index) => join(dir, `${index}.svg`))
				],
				{ stdout: "pipe", stderr: "pipe" }
			)
			const [code, errors] = await Promise.all([
				proc.exited,
				new Response(proc.stderr).text()
			])
			expect(errors).toBe("")
			expect(code).toBe(0)
		}
	)
})
