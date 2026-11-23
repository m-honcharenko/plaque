import type { ProvidedValue } from "../ports/value-provider.port.js"
import type { BadgeInput } from "./badge-config.js"

// Whatever the caller sets by hand; the value itself always comes from the
// provider.
export type BadgeOverrides = Omit<BadgeInput, "value">

// The badge input for a live value. The provider's label, color and icon are
// defaults: anything the caller passed wins, even an empty label.
export function inputFromValue(
	provided: ProvidedValue,
	overrides: BadgeOverrides = {}
): BadgeInput {
	return {
		...overrides,
		label: overrides.label ?? provided.label,
		value: provided.value,
		// With a label color the value side is derived from it, so the
		// provider's color must not take its place.
		color:
			overrides.color ??
			(overrides.labelColor === undefined ? provided.color : undefined),
		// An own path and a named icon exclude each other.
		icon:
			overrides.icon ??
			(overrides.iconPath === undefined
				? (provided.icon ?? undefined)
				: undefined)
	}
}
