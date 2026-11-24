import type { FastifyRequest } from "fastify"

// PUBLIC_URL wins so a snippet points at the right host behind a proxy.
export function originOf(request: FastifyRequest): string {
	const configured = process.env.PUBLIC_URL
	const origin = configured ?? `${request.protocol}://${request.host}`
	return origin.replace(/\/+$/, "")
}
