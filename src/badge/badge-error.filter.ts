import {
	BadRequestException,
	Catch,
	type ArgumentsHost,
	type ExceptionFilter
} from "@nestjs/common"
import type { FastifyReply } from "fastify"

import { renderInvalidParamsBadge } from "../core/badge/error-badge.js"

// Answers invalid params with HTTP 400 and the badge itself: a broken
// image in a README looks worse than a red "error" badge.
@Catch(BadRequestException)
export class BadgeErrorFilter implements ExceptionFilter {
	catch(_exception: BadRequestException, host: ArgumentsHost): void {
		const reply = host.switchToHttp().getResponse<FastifyReply>()
		reply
			.status(400)
			.header("Content-Type", "image/svg+xml; charset=utf-8")
			.header("Cache-Control", "public, max-age=60")
			.send(renderInvalidParamsBadge())
	}
}
