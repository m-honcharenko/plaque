import { ValueError } from "../core/ports/value-provider.port.js"
import { isAllowedUpstream } from "../core/values/upstream.js"

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export const FETCH_LIMITS = {
	// The whole call, redirects and reading the body included.
	timeoutMs: 4000,
	maxBytes: 1_000_000,
	maxRedirects: 3
} as const

export type FetchJsonOptions = {
	timeoutMs?: number
	maxBytes?: number
	headers?: Record<string, string>
	fetch?: FetchLike
}

const REDIRECTS = new Set([301, 302, 303, 307, 308])

function unavailable(message: string): ValueError {
	return new ValueError("unavailable", message)
}

// Drops what is left of a response we will not read.
function discard(response: Response): void {
	void response.body?.cancel().catch(() => undefined)
}

async function send(
	fetcher: FetchLike,
	url: URL,
	headers: Record<string, string>,
	signal: AbortSignal
): Promise<Response> {
	try {
		// Redirects are followed by hand, so each hop can be checked.
		return await fetcher(url.href, { headers, signal, redirect: "manual" })
	} catch {
		throw unavailable("The request failed or timed out")
	}
}

async function readText(response: Response, maxBytes: number): Promise<string> {
	const declared = Number(response.headers.get("content-length"))
	if (Number.isFinite(declared) && declared > maxBytes) {
		discard(response)
		throw unavailable("The response is too big")
	}
	if (response.body === null) return ""

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let text = ""
	let total = 0
	try {
		for (;;) {
			const { done, value } = await reader.read()
			if (done) break
			total += value.byteLength
			if (total > maxBytes) throw unavailable("The response is too big")
			text += decoder.decode(value, { stream: true })
		}
		return text + decoder.decode()
	} catch (error) {
		if (error instanceof ValueError) throw error
		throw unavailable("Reading the response failed")
	} finally {
		void reader.cancel().catch(() => undefined)
	}
}

// Fetches JSON from an allowed upstream. Never throws anything but a
// ValueError, except for a URL that is not allowed in the first place (a
// bug in the caller): 404 is not_found, everything else that goes wrong is
// unavailable. Redirects are followed only to other allowed addresses.
export async function fetchJson(
	url: URL,
	options: FetchJsonOptions = {}
): Promise<unknown> {
	const timeoutMs = options.timeoutMs ?? FETCH_LIMITS.timeoutMs
	const maxBytes = options.maxBytes ?? FETCH_LIMITS.maxBytes
	const fetcher = options.fetch ?? fetch
	const headers = {
		accept: "application/json",
		"user-agent": "plaque",
		...options.headers
	}
	if (!isAllowedUpstream(url)) {
		throw new RangeError("Upstream host is not allowed")
	}

	const signal = AbortSignal.timeout(timeoutMs)
	let current = url
	for (let hop = 0; hop <= FETCH_LIMITS.maxRedirects; hop += 1) {
		const response = await send(fetcher, current, headers, signal)

		if (REDIRECTS.has(response.status)) {
			const location = response.headers.get("location")
			discard(response)
			let next: URL | null = null
			try {
				next = location === null ? null : new URL(location, current)
			} catch {
				next = null
			}
			if (next === null || !isAllowedUpstream(next)) {
				throw unavailable("Redirected to an address that is not allowed")
			}
			current = next
			continue
		}
		if (response.status === 404) {
			discard(response)
			throw new ValueError("not_found")
		}
		if (!response.ok) {
			discard(response)
			throw unavailable(`The upstream answered ${response.status}`)
		}

		const text = await readText(response, maxBytes)
		try {
			return JSON.parse(text) as unknown
		} catch {
			throw unavailable("The response is not JSON")
		}
	}
	throw unavailable("Too many redirects")
}
