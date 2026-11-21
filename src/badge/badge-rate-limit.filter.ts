import { Catch, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common"
import { ThrottlerException } from "@nestjs/throttler"
import type { FastifyReply } from "fastify"

import { renderRateLimitedBadge } from "../core/badge/error-badge.js"

// Answers 429 with a badge too. no-store keeps a proxy from serving the
// "rate limited" image to clients that are not limited.
@Catch(ThrottlerException)
export class BadgeRateLimitFilter implements ExceptionFilter {
	catch(_exception: ThrottlerException, host: ArgumentsHost): void {
		const reply = host.switchToHttp().getResponse<FastifyReply>()
		reply
			.status(429)
			.header("Content-Type", "image/svg+xml; charset=utf-8")
			.header("Cache-Control", "no-store")
			.send(renderRateLimitedBadge())
	}
}
