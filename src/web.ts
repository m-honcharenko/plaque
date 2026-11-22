import { existsSync } from "node:fs"
import { resolve } from "node:path"

import fastifyStatic from "@fastify/static"
import type { NestFastifyApplication } from "@nestjs/platform-fastify"

// Where `bun run build:web` puts the bundle. Relative to the working
// directory, which is the repo root in development and /app in Docker.
export const DEFAULT_WEB_DIR = "dist/web"

const HTML_CACHE = "no-cache"
// Bun puts a content hash in every asset name, so assets never change.
const ASSET_CACHE = "public, max-age=31536000, immutable"

// Serves the built web app next to the API. Returns false when there is no
// build, so the API still starts in development and in tests.
export async function setupWeb(
	app: NestFastifyApplication,
	dir: string = process.env.WEB_DIR ?? DEFAULT_WEB_DIR
): Promise<boolean> {
	const root = resolve(dir)
	if (!existsSync(root)) return false
	await app.register(fastifyStatic, {
		root,
		index: "index.html",
		// One route per file instead of a catch-all, so it cannot shadow the API.
		wildcard: false,
		setHeaders(res, path) {
			res.header(
				"Cache-Control",
				path.endsWith(".html") ? HTML_CACHE : ASSET_CACHE
			)
		}
	})
	return true
}
