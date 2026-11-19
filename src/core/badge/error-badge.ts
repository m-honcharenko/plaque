import { normalizeConfig } from "./badge-config.js"
import { renderBadge } from "./render-badge.js"

// The badge shown instead of a broken image when the request is invalid.
export function renderInvalidParamsBadge(): string {
	return renderBadge(
		normalizeConfig({
			label: "error",
			value: "invalid params",
			color: "error"
		})
	)
}
