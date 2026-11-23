import {
	ValueError,
	type ProvidedValue,
	type ValueProvider,
	type ValueQuery
} from "../core/ports/value-provider.port.js"
import { upstreamUrl } from "../core/values/upstream.js"
import { fetchJson } from "./fetch-json.js"

export type JsonGetter = (url: URL) => Promise<unknown>

// Digits, letters and the dots, plusses and hyphens of semver, short enough
// for a badge. Anything else in a registry answer is not shown.
const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/

// The latest version of an npm package, from the public registry.
export class NpmProvider implements ValueProvider {
	constructor(private readonly getJson: JsonGetter = fetchJson) {}

	async fetch(query: ValueQuery): Promise<ProvidedValue> {
		if (query.source !== "npm") {
			throw new RangeError("NpmProvider only answers npm queries")
		}
		const body = await this.getJson(upstreamUrl(query))
		const version =
			typeof body === "object" && body !== null
				? (body as { version?: unknown }).version
				: undefined
		if (typeof version !== "string" || !VERSION.test(version)) {
			throw new ValueError("unavailable", "Unexpected answer from npm")
		}
		return { label: "npm", value: `v${version}`, color: "info", icon: "npm" }
	}
}
