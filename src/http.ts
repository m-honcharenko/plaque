import compress from "@fastify/compress"
import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"

import { renderInvalidParamsBadge } from "./core/badge/error-badge.js"
import { MAX_BODY_BYTES, checkRequestLimits } from "./request-limits.js"

// A badge is about 1 KB even without an icon (the style block alone is
// 600 bytes), so the plugin's default threshold of 1024 would skip half of
// them. Every response here is worth compressing.
const COMPRESS_THRESHOLD = 256

export function createAdapter(): FastifyAdapter {
	return new FastifyAdapter({
		// Behind a proxy the client address comes from X-Forwarded-For.
		trustProxy: process.env.TRUST_PROXY === "true",
		bodyLimit: MAX_BODY_BYTES,
		// The default of 100 would answer 414 (not a badge) for a long npm
		// name; the longest valid one is 214 characters.
		routerOptions: { maxParamLength: 256 }
	})
}

// The routes that answer with a badge, so an oversized request to them gets
// a badge too.
function isBadgePath(path: string): boolean {
	return (
		path === "/badge" || path.startsWith("/gh/") || path.startsWith("/npm/")
	)
}

// HTTP behavior shared by main.ts and the e2e tests.
export async function setupHttp(app: NestFastifyApplication): Promise<void> {
	await app.register(compress, {
		global: true,
		encodings: ["gzip"],
		threshold: COMPRESS_THRESHOLD
	})

	// Runs before routing, so an oversized request costs almost nothing and
	// does not use up the client's rate limit.
	app
		.getHttpAdapter()
		.getInstance()
		.addHook("onRequest", async (request, reply) => {
			const url = request.raw.url ?? ""
			const problem = checkRequestLimits(url)
			if (problem === null) return
			reply.status(problem.status)
			// The badge endpoints always answer with a badge.
			if (isBadgePath(url.split("?")[0] ?? "")) {
				return reply
					.header("Content-Type", "image/svg+xml; charset=utf-8")
					.header("Cache-Control", "public, max-age=60")
					.send(renderInvalidParamsBadge())
			}
			return reply.send({
				statusCode: problem.status,
				message: problem.message
			})
		})
}
