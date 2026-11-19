import { colorHex, type BadgeConfig } from "./badge-config.js"

export function escapeXml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;")
}

// Day 1 stub. Real layout and rendering arrive on days 4-5.
export function renderBadge(config: BadgeConfig): string {
	const label = escapeXml(config.label)
	const value = escapeXml(config.value)
	return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="28" viewBox="0 0 180 28" role="img" aria-label="${label}: ${value}"><rect width="180" height="28" rx="6" fill="#${colorHex(config.color)}"/><text x="90" y="19" text-anchor="middle" font-size="12" fill="#fff">${label}: ${value}</text></svg>`
}
