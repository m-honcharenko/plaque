import { createHash } from "node:crypto"

// A strong validator: the same body always gets the same ETag, and a new
// renderer version changes it together with the body.
export function etagOf(body: string): string {
	const digest = createHash("sha256").update(body).digest("base64url")
	return `"${digest.slice(0, 27)}"`
}

// Does an If-None-Match header cover this ETag? GET uses the weak
// comparison (RFC 9110), so a W/ prefix, which compression proxies add,
// is ignored.
export function matchesEtag(header: string | undefined, etag: string): boolean {
	if (header === undefined) return false
	if (header.trim() === "*") return true
	return header
		.split(",")
		.some((tag) => tag.trim().replace(/^W\//, "") === etag)
}
