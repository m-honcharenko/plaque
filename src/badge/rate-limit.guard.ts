import {
	HttpException,
	Inject,
	Injectable,
	type CanActivate,
	type ExecutionContext
} from "@nestjs/common"
import type { FastifyReply, FastifyRequest } from "fastify"

import { RATE_LIMITER, type RateLimiter } from "../infra/rate-limiter.js"

export class RateLimitedException extends HttpException {
	constructor() {
		super("Too Many Requests", 429)
	}
}

@Injectable()
export class RateLimitGuard implements CanActivate {
	constructor(@Inject(RATE_LIMITER) private readonly limiter: RateLimiter) {}

	canActivate(context: ExecutionContext): boolean {
		const http = context.switchToHttp()
		const decision = this.limiter.hit(http.getRequest<FastifyRequest>().ip)
		if (decision.allowed) return true
		http
			.getResponse<FastifyReply>()
			.header("Retry-After", String(decision.retryAfterSeconds))
		throw new RateLimitedException()
	}
}
