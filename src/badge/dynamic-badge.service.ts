import { Inject, Injectable } from "@nestjs/common"

import {
	renderNotFoundBadge,
	renderUnavailableBadge
} from "../core/badge/error-badge.js"
import {
	inputFromValue,
	type BadgeOverrides
} from "../core/badge/provider-input.js"
import {
	VALUE_PROVIDER,
	ValueError,
	type ValueProvider,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import { metricLabel } from "../core/values/query.js"
import { BadgeService } from "./badge.service.js"

export const DYNAMIC_CACHE = {
	value: "public, max-age=300",
	notFound: "public, max-age=300",
	// Short, so a recovered upstream shows up soon.
	unavailable: "public, max-age=60"
} as const

export type DynamicBadge = { svg: string; cacheControl: string }

// Turns a query into a badge. A value that cannot be had becomes a badge
// too, with status 200 like the rest: GitHub's image proxy turns every other
// status into a broken image, and a README is where these badges live.
@Injectable()
export class DynamicBadgeService {
	constructor(
		@Inject(VALUE_PROVIDER) private readonly values: ValueProvider,
		private readonly badges: BadgeService
	) {}

	async render(
		query: ValueQuery,
		overrides: BadgeOverrides
	): Promise<DynamicBadge> {
		try {
			const provided = await this.values.fetch(query)
			return {
				svg: this.badges.render(inputFromValue(provided, overrides)),
				cacheControl: DYNAMIC_CACHE.value
			}
		} catch (error) {
			if (!(error instanceof ValueError)) throw error
			const label = metricLabel(query)
			return error.reason === "not_found"
				? {
						svg: renderNotFoundBadge(label),
						cacheControl: DYNAMIC_CACHE.notFound
					}
				: {
						svg: renderUnavailableBadge(label),
						cacheControl: DYNAMIC_CACHE.unavailable
					}
		}
	}
}
