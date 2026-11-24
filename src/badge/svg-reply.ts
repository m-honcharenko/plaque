import type { FastifyReply } from "fastify"

import { etagOf, matchesEtag } from "./etag.js"

// Sends an SVG with an ETag, or 304 when the client's copy is current.
export function sendSvg(
	reply: FastifyReply,
	svg: string,
	cacheControl: string,
	ifNoneMatch: string | undefined
): FastifyReply {
	const etag = etagOf(svg)
	reply.header("ETag", etag).header("Cache-Control", cacheControl)
	if (matchesEtag(ifNoneMatch, etag)) return reply.status(304).send()
	return reply.header("Content-Type", "image/svg+xml; charset=utf-8").send(svg)
}
