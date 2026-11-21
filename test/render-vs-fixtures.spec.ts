import { describe, expect, it } from "bun:test"

import { normalizeConfig } from "../src/core/badge/badge-config.js"
import { layout } from "../src/core/badge/layout.js"
import { renderBadge } from "../src/core/badge/render-badge.js"
import { FIXTURE_CASES } from "./fixture-cases.js"

const NUMBER = "([\\d.]+)"

// What a fixture says about its geometry, read from the SVG text.
function readFixture(svg: string) {
	const size = svg.match(new RegExp(`viewBox="0 0 ${NUMBER} ${NUMBER}"`))
	const rects = svg.matchAll(
		new RegExp(
			`<rect class="[\\w-]+-bg" x="${NUMBER}" y="${NUMBER}" width="${NUMBER}" height="${NUMBER}"/>`,
			"g"
		)
	)
	const icons = svg.matchAll(
		new RegExp(`<g transform="translate\\(${NUMBER} ${NUMBER}\\)`, "g")
	)
	const texts = svg.matchAll(
		new RegExp(
			`<text class="[\\w-]+" x="${NUMBER}" y="${NUMBER}"[^>]*textLength="${NUMBER}"`,
			"g"
		)
	)
	return {
		size: [Number(size?.[1]), Number(size?.[2])],
		sections: [...rects].map((m) => ({
			x: Number(m[1]),
			y: Number(m[2]),
			width: Number(m[3]),
			height: Number(m[4])
		})),
		icons: [...icons].map((m) => ({ x: Number(m[1]), y: Number(m[2]) })),
		texts: [...texts].map((m) => ({
			x: Number(m[1]),
			y: Number(m[2]),
			width: Number(m[3])
		}))
	}
}

describe("generated badges match the reference fixtures", () => {
	for (const { file, input, variant } of FIXTURE_CASES) {
		describe(file, async () => {
			const fixture = readFixture(await Bun.file(`fixtures/${file}`).text())
			const config = normalizeConfig(input)
			const result = layout(config, variant)

			it("has the same size", () => {
				expect([result.width, result.height]).toEqual(fixture.size)
				const [width, height] = fixture.size
				expect(renderBadge(config, variant)).toContain(
					`viewBox="0 0 ${width} ${height}"`
				)
			})

			it("has the same sections", () => {
				expect(result.sections.map((section) => section.box)).toEqual(
					fixture.sections
				)
			})

			it("puts the icons in the same places", () => {
				const icons = result.sections.flatMap((section) =>
					section.icon === null
						? []
						: [{ x: section.icon.x, y: section.icon.y }]
				)
				expect(icons).toEqual(fixture.icons)
			})

			it("puts the text in the same places", () => {
				const texts = result.sections.flatMap((section) =>
					section.text === null
						? []
						: [
								{
									x: section.text.x,
									y: section.text.y,
									width: section.text.width
								}
							]
				)
				expect(texts).toEqual(fixture.texts)
			})
		})
	}
})
