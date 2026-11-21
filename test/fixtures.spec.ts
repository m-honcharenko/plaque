import { describe, expect, it } from "bun:test"

const variants = {
	"status-full.svg": { w: 149, h: 28 },
	"status-compact.svg": { w: 72, h: 28 },
	"data-full.svg": { w: 153, h: 28 },
	"data-vertical.svg": { w: 60, h: 52 }
}

describe("reference badge variants", () => {
	for (const [file, { w, h }] of Object.entries(variants)) {
		describe(file, async () => {
			const svg = await Bun.file(`fixtures/${file}`).text()

			it("has the expected size and viewBox", () => {
				expect(svg).toContain(`width="${w}"`)
				expect(svg).toContain(`height="${h}"`)
				expect(svg).toContain(`viewBox="0 0 ${w} ${h}"`)
			})

			it("is self-contained and safe", () => {
				expect(svg).not.toMatch(/<script|foreignObject|href=|url\(http/i)
			})
		})
	}
})
