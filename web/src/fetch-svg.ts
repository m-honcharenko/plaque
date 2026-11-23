import { MAX_SVG_LENGTH } from "./svg-path.js"

export type Fetched = { ok: true; text: string } | { ok: false; error: string }

const TIMEOUT_MS = 8000

// A GitHub page URL (.../blob/...) is HTML; the file itself lives on
// raw.githubusercontent.com.
export function toFileUrl(raw: string): string | null {
	let url: URL
	try {
		url = new URL(raw.trim())
	} catch {
		return null
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return null
	const blob =
		url.hostname === "github.com" && url.pathname.split("/")[3] === "blob"
	if (blob) {
		const [, owner, repo, , ...rest] = url.pathname.split("/")
		return `https://raw.githubusercontent.com/${owner}/${repo}/${rest.join("/")}`
	}
	return url.href
}

// Reads at most `max` characters, so a huge file is never held in memory.
async function readCapped(res: Response, max: number): Promise<string | null> {
	const reader = res.body?.getReader()
	if (reader === undefined) return (await res.text()).slice(0, max + 1)
	const decoder = new TextDecoder()
	let text = ""
	for (;;) {
		const { done, value } = await reader.read()
		if (done) return text
		text += decoder.decode(value, { stream: true })
		if (text.length > max) {
			await reader.cancel()
			return null
		}
	}
}

// The browser asks the other site for the file, the service never does. A
// site that does not allow other sites to read it (CORS) answers with a
// network error that cannot be told apart from being offline.
export async function fetchSvg(raw: string): Promise<Fetched> {
	const target = toFileUrl(raw)
	if (target === null) {
		return { ok: false, error: "Use a full http(s) link to an .svg file." }
	}
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
	try {
		const res = await fetch(target, {
			signal: controller.signal,
			credentials: "omit",
			referrerPolicy: "no-referrer"
		})
		if (!res.ok) {
			return { ok: false, error: `The site answered ${res.status}.` }
		}
		const text = await readCapped(res, MAX_SVG_LENGTH)
		if (text === null) {
			return {
				ok: false,
				error: "The file is too big for an icon (over 100 KB)."
			}
		}
		return { ok: true, text }
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			return { ok: false, error: "The site took too long to answer." }
		}
		return {
			ok: false,
			error:
				"Could not load it. Many sites do not let other sites read their files (CORS): download the SVG and upload it, or paste its code."
		}
	} finally {
		clearTimeout(timer)
	}
}
