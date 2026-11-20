import type { IconName } from "../icons/icons.js"
import type { Layout } from "./badge-options.js"

export type StatusKind =
	| "success"
	| "failure"
	| "warning"
	| "running"
	| "pending"
	| "skipped"
	| "canceled"

// The words that make a value a status. Matching is exact: a status is
// shown as an icon alone on narrow screens, so wrongly calling data a
// status loses information, while the opposite mistake only costs space.
// Words that are often plain data ("stable", "active", "beta") stay out.
export const STATUS_WORDS: Record<StatusKind, readonly string[]> = {
	success: [
		"passing",
		"passed",
		"pass",
		"success",
		"successful",
		"ok",
		"healthy",
		"operational",
		"online",
		"up"
	],
	failure: [
		"failing",
		"failed",
		"fail",
		"failure",
		"error",
		"broken",
		"offline",
		"down"
	],
	warning: ["warning", "unstable", "degraded"],
	running: ["running", "building", "deploying", "in progress"],
	pending: ["pending", "queued", "waiting", "scheduled"],
	skipped: ["skipped"],
	canceled: ["canceled", "cancelled", "aborted", "stopped"]
}

// The icon a status turns into in the compact layout.
export const STATUS_ICONS: Record<StatusKind, IconName> = {
	success: "check-circle",
	failure: "x-circle",
	warning: "alert",
	running: "sync",
	pending: "clock",
	skipped: "skip",
	canceled: "stop"
}

const KIND_BY_WORD = new Map<string, StatusKind>(
	Object.entries(STATUS_WORDS).flatMap(([kind, words]) =>
		words.map((word): [string, StatusKind] => [word, kind as StatusKind])
	)
)

// The status a value stands for, or null when it is data.
export function statusOf(value: string): StatusKind | null {
	const word = value.trim().toLowerCase().replace(/\s+/g, " ")
	return KIND_BY_WORD.get(word) ?? null
}

// The layout for narrow screens: a status shrinks to [icon | status icon],
// data keeps its text and stacks under the icon.
export function narrowLayout(
	value: string
): Extract<Layout, "compact" | "vertical"> {
	return statusOf(value) === null ? "vertical" : "compact"
}
