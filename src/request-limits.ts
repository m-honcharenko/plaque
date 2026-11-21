// Bun already refuses headers over 16 KB with 431. These limits are much
// tighter: a real badge URL is a few hundred bytes with 6 params at most.
export const MAX_URL_LENGTH = 2048
export const MAX_QUERY_PARAMS = 16
// Every route is a GET, so a body is never needed.
export const MAX_BODY_BYTES = 1024

export type LimitProblem = { status: 400 | 414; message: string }

// Checks the raw request target (path and query) before anything parses it.
export function checkRequestLimits(url: string): LimitProblem | null {
	if (url.length > MAX_URL_LENGTH) {
		return {
			status: 414,
			message: `URL is longer than ${MAX_URL_LENGTH} characters`
		}
	}
	const queryStart = url.indexOf("?")
	if (queryStart === -1) return null
	const params = url
		.slice(queryStart + 1)
		.split("&")
		.filter((param) => param !== "")
	if (params.length > MAX_QUERY_PARAMS) {
		return {
			status: 400,
			message: `More than ${MAX_QUERY_PARAMS} query params`
		}
	}
	return null
}
