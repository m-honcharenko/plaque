import { Catch, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common"
import type { FastifyReply } from "fastify"

import { renderRateLimitedBadge } from "../core/badge/error-badge.js"
import { RateLimitedException } from "./rate-limit.guard.js"

// Answers 429 with a badge too. no-store keeps a proxy from serving the
// "rate limited" image to clients that are not limited.
@Catch(RateLimitedException)
export class BadgeRateLimitFilter implements ExceptionFilter {
	catch(_exception: RateLimitedException, host: ArgumentsHost): void {
		const reply = host.switchToHttp().getResponse<FastifyReply>()
		reply
			.status(429)
			.header("Content-Type", "image/svg+xml; charset=utf-8")
			.header("Cache-Control", "no-store")
			.send(renderRateLimitedBadge())
	}
}
