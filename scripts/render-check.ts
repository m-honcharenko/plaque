import { mkdir, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"

const FIXTURES = resolve("fixtures")
const OUT = resolve(".render")
const PADDING = 12
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

const files = (await readdir(FIXTURES)).filter((f) => f.endsWith(".svg"))
let failed = 0

for (const file of files) {
	const svg = await Bun.file(join(FIXTURES, file)).text()
	const { w, h } = sizeOf(svg)
	const name = file.replace(/\.svg$/, "")

	for (const scheme of SCHEMES) {
		const page = join(OUT, `${name}-${scheme.name}.html`)
		const shot = join(OUT, `${name}-${scheme.name}.png`)
		await Bun.write(
			page,
			`<!doctype html><meta charset="utf-8"><body style="margin:0;padding:${PADDING}px;background:${scheme.background}"><img src="${join(FIXTURES, file)}" style="display:block" alt="">`
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
				`--window-size=${w + PADDING * 2},${h + PADDING * 2}`,
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
