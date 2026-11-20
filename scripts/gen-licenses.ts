// Writes THIRD_PARTY_LICENSES.md from the packages whose data is copied
// into the repo (icon paths, font metrics). Run: bun run licenses:generate
import { readFileSync, writeFileSync } from "node:fs"

const license = (pkg: string) =>
	readFileSync(`node_modules/${pkg}/LICENSE`, "utf8").trim()
const version = (pkg: string) =>
	(
		JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, "utf8")) as {
			version: string
		}
	).version

writeFileSync(
	"THIRD_PARTY_LICENSES.md",
	`# Third-party licenses

Data copied into this repository from the packages below. Regenerate with
\`bun run licenses:generate\`.

## Octicons (@primer/octicons ${version("@primer/octicons")}), MIT

Icon paths in \`src/core/icons/icons.data.ts\`.

${license("@primer/octicons")}

## Simple Icons (simple-icons ${version("simple-icons")}), CC0-1.0

Brand icon paths in \`src/core/icons/icons.data.ts\`. The artwork is public
domain, but the brands themselves are trademarks of their owners. See the
Simple Icons legal disclaimer:
https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md

## Inter (@fontsource/inter ${version("@fontsource/inter")}), OFL-1.1

Only advance widths measured from the font are used, in
\`src/core/text/metrics.data.ts\`; the font files are not distributed.

${license("@fontsource/inter")}
`
)

console.log("Wrote THIRD_PARTY_LICENSES.md")
