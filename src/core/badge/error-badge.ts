import { normalizeConfig } from "./badge-config.js"
import type { ColorToken } from "./badge-options.js"
import { renderBadge } from "./render-badge.js"

// The badge shown instead of a broken image when a request fails.
function renderErrorBadge(value: string, color: ColorToken): string {
	return renderBadge(normalizeConfig({ label: "error", value, color }))
}

export function renderInvalidParamsBadge(): string {
	return renderErrorBadge("invalid params", "error")
}

export function renderRateLimitedBadge(): string {
	return renderErrorBadge("rate limited", "warning")
}
