import { mkdir } from "node:fs/promises"
import { join, resolve } from "node:path"

import { normalizeConfig } from "../src/core/badge/badge-config.js"
import { renderBadge } from "../src/core/badge/render-badge.js"
import { FIXTURE_CASES } from "../test/fixture-cases.js"

const FIXTURES = resolve("fixtures")
const OUT = resolve(".render")
const PADDING = 12
const GAP = 8
const SCHEMES = [
	{ name: "light", background: "#ffffff", setting: 1 },
	{ name: "dark", background: "#0d1117", setting: 0 }
]

function findChrome(): string {
	const candidates = [
		process.env.CHROME_BIN,
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		Bun.which("google-chrome"),
		Bun.which("chromium"),
		Bun.which("chromium-browser")
	]
	for (const path of candidates) {
		if (path && Bun.file(path).size > 0) return path
	}
	throw new Error("Chrome not found. Set CHROME_BIN to its path.")
}

function sizeOf(svg: string): { w: number; h: number } {
	const match = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/)
	if (!match) throw new Error("viewBox not found")
	return { w: Number(match[1]), h: Number(match[2]) }
}

const chrome = findChrome()
await mkdir(OUT, { recursive: true })

let failed = 0

// Every shot has the reference fixture on top and the generated badge below.
for (const { file, input, variant } of FIXTURE_CASES) {
	const fixturePath = join(FIXTURES, file)
	const generatedPath = join(OUT, file)
	const generated = renderBadge(normalizeConfig(input), variant)
	await Bun.write(generatedPath, generated)

	const fixture = sizeOf(await Bun.file(fixturePath).text())
	const actual = sizeOf(generated)
	const sameSize = fixture.w === actual.w && fixture.h === actual.h
	if (!sameSize) failed++
	const name = file.replace(/\.svg$/, "")
	console.log(
		`${sameSize ? "ok  " : "FAIL"} ${name} size ${actual.w}x${actual.h}, fixture ${fixture.w}x${fixture.h}`
	)

	const width = Math.max(fixture.w, actual.w) + PADDING * 2
	const height = fixture.h + GAP + actual.h + PADDING * 2

	for (const scheme of SCHEMES) {
		const page = join(OUT, `${name}-${scheme.name}.html`)
		const shot = join(OUT, `${name}-${scheme.name}.png`)
		await Bun.write(
			page,
			`<!doctype html><meta charset="utf-8"><body style="margin:0;padding:${PADDING}px;background:${scheme.background}"><img src="${fixturePath}" style="display:block;margin-bottom:${GAP}px" alt=""><img src="${generatedPath}" style="display:block" alt="">`
		)
		const proc = Bun.spawn(
			[
				chrome,
				"--headless=new",
				"--no-sandbox",
				"--disable-gpu",
				"--hide-scrollbars",
				"--force-device-scale-factor=2",
				`--blink-settings=preferredColorScheme=${scheme.setting}`,
				`--window-size=${width},${height}`,
				`--screenshot=${shot}`,
				`file://${page}`
			],
			{ stdout: "ignore", stderr: "ignore" }
		)
		const code = await proc.exited
		const ok = code === 0 && Bun.file(shot).size > 0
		if (!ok) failed++
		console.log(`${ok ? "ok  " : "FAIL"} ${name} ${scheme.name}`)
	}
}

console.log(`Screenshots: ${OUT}`)
process.exit(failed === 0 ? 0 : 1)
