import { Module } from "@nestjs/common"

import { cacheSizeFromEnv } from "../cache-size.js"
import { BADGE_CACHE } from "../core/ports/badge-cache.port.js"
import { VALUE_PROVIDER } from "../core/ports/value-provider.port.js"
import { CachedValueProvider } from "../infra/cached-value-provider.js"
import { GithubProvider, githubJsonGetter } from "../infra/github-provider.js"
import { LruBadgeCache } from "../infra/lru-badge-cache.js"
import { NpmProvider } from "../infra/npm-provider.js"
import { NullBadgeCache } from "../infra/null-badge-cache.js"
import { RATE_LIMITER, RateLimiter } from "../infra/rate-limiter.js"
import { RoutedValueProvider } from "../infra/routed-value-provider.js"
import { rateLimitFromEnv } from "../rate-limit.js"
import { BadgeController } from "./badge.controller.js"
import { BadgeService } from "./badge.service.js"
import { DynamicBadgeController } from "./dynamic-badge.controller.js"
import { DynamicBadgeService } from "./dynamic-badge.service.js"
import { DynamicSnippetController } from "./dynamic-snippet.controller.js"
import { RateLimitGuard } from "./rate-limit.guard.js"
import { SnippetController } from "./snippet.controller.js"

@Module({
	controllers: [
		BadgeController,
		SnippetController,
		DynamicBadgeController,
		DynamicSnippetController
	],
	providers: [
		BadgeService,
		DynamicBadgeService,
		RateLimitGuard,
		{
			provide: RATE_LIMITER,
			useFactory: () => new RateLimiter(rateLimitFromEnv(process.env))
		},
		{
			provide: BADGE_CACHE,
			useFactory: () => {
				const size = cacheSizeFromEnv(process.env)
				return size === 0 ? new NullBadgeCache() : new LruBadgeCache(size)
			}
		},
		{
			// GITHUB_TOKEN is optional: without it GitHub allows 60 requests
			// an hour, with it 5000.
			provide: VALUE_PROVIDER,
			useFactory: () =>
				new CachedValueProvider(
					new RoutedValueProvider({
						npm: new NpmProvider(),
						github: new GithubProvider(
							githubJsonGetter(process.env.GITHUB_TOKEN)
						)
					})
				)
		}
	]
})
export class BadgeModule {}
