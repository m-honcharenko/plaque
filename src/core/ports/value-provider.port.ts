import type { ColorToken } from "../badge/badge-options.js"
import type { IconName } from "../icons/icons.js"

export const GITHUB_METRICS = ["stars", "ci", "release", "license"] as const
export type GithubMetric = (typeof GITHUB_METRICS)[number]

// What a dynamic badge asks for. Names are checked before they get here.
export type ValueQuery =
	| { source: "npm"; metric: "version"; name: string }
	| { source: "github"; metric: GithubMetric; owner: string; repo: string }

// A live value with the defaults of its badge. Whether the value is a status
// or data is not stored: the word list in value-kind.ts decides that.
export type ProvidedValue = {
	label: string
	value: string
	color: ColorToken
	icon: IconName | null
}

// not_found: the upstream has no such repo or package.
// unavailable: it did not answer in time, answered badly or refused us.
export type ValueFailure = "not_found" | "unavailable"

export class ValueError extends Error {
	constructor(
		readonly reason: ValueFailure,
		message: string = reason
	) {
		super(message)
		this.name = "ValueError"
	}
}

export interface ValueProvider {
	// Resolves with the value or rejects with a ValueError.
	fetch(query: ValueQuery): Promise<ProvidedValue>
}
