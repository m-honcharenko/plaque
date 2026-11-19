import { ICON_DATA } from "./icons.data.js"

export type IconData = { size: 16 | 24; d: string }

export type IconName = keyof typeof ICON_DATA

export const ICON_NAMES = Object.keys(ICON_DATA) as IconName[]

const ICONS: Readonly<Record<string, IconData>> = ICON_DATA

export function isIconName(name: string): name is IconName {
	return Object.hasOwn(ICONS, name)
}

// undefined for any name outside the whitelist, including "__proto__".
export function getIcon(name: string): IconData | undefined {
	return isIconName(name) ? ICONS[name] : undefined
}

// The icon as an SVG <path>. Only whitelisted, pre-checked path data ends
// up here; the fill is left to CSS so the theme controls the color.
export function iconPath(icon: IconData, className = "icon"): string {
	return `<path class="${className}" d="${icon.d}"/>`
}
