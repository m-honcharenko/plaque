import { normalizeConfig } from "./badge-config.js"
import type { ColorToken } from "./badge-options.js"
import { renderBadge } from "./render-badge.js"

// The badge shown instead of a broken image when a request fails.
function renderErrorBadge(
	value: string,
	color: ColorToken,
	label = "error"
): string {
	return renderBadge(normalizeConfig({ label, value, color }))
}

export function renderInvalidParamsBadge(): string {
	return renderErrorBadge("invalid params", "error")
}

export function renderRateLimitedBadge(): string {
	return renderErrorBadge("rate limited", "warning")
}

// The badges of a live value that could not be shown. They keep the label of
// the badge they stand in for, so a README still says what is missing.
export function renderNotFoundBadge(label: string): string {
	return renderErrorBadge("not found", "error", label)
}

export function renderUnavailableBadge(label: string): string {
	return renderErrorBadge("unavailable", "warning", label)
}
