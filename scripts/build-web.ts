import { rmSync, watch } from "node:fs"

import tailwind from "bun-plugin-tailwind"

// Builds the web app into dist/web. Run with --watch to rebuild on change.
async function build(): Promise<boolean> {
	// Old hashed files would pile up otherwise.
	rmSync("dist/web", { recursive: true, force: true })
	const result = await Bun.build({
		entrypoints: ["web/index.html", "web/builder/index.html"],
		outdir: "dist/web",
		minify: true,
		plugins: [tailwind]
	})
	for (const log of result.logs) console.error(log)
	console.log(result.success ? "web: built" : "web: failed")
	return result.success
}

const ok = await build()
if (process.argv.includes("--watch")) {
	let timer: ReturnType<typeof setTimeout> | undefined
	watch("web", { recursive: true }, () => {
		clearTimeout(timer)
		timer = setTimeout(() => void build(), 100)
	})
} else if (!ok) {
	process.exit(1)
}
