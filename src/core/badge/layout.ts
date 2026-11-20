import { measure, type FontWeight } from "../text/measure.js"
import { truncateToWidth } from "../text/truncate.js"
import type { BadgeConfig } from "./badge-config.js"
import type { Layout } from "./badge-options.js"
import { STATUS_ICONS, statusOf } from "./value-kind.js"

// All numbers are px and come from the reference fixtures.
const ICON = 16 // every icon is drawn 16px wide
const PAD_ICON = 10 // beside an icon
const PAD_TEXT = 12 // beside text
const GAP = 7 // between an icon and its text
const PAD_Y = 6 // above and below an icon
const FONT = 13
const FONT_SMALL = 12 // text of the vertical layout
const ROW = ICON + 2 * PAD_Y // 28
const ROW_SMALL = FONT_SMALL + 2 * PAD_Y // 24

// The longest text a badge shows before it is cut with an ellipsis.
export const TEXT_CAP = {
	label: 120,
	value: 140,
	compactValue: 64,
	verticalText: 100
} as const

export type Box = { x: number; y: number; width: number; height: number }

// The renderer looks `name` up in the icon whitelist and scales the icon's
// own viewBox to `size`.
export type IconPlacement = {
	name: string
	x: number
	y: number
	size: number
}

export type TextPlacement = {
	text: string // already cut to fit, not escaped yet
	x: number
	y: number // baseline
	width: number // measured, rounded up: the value for textLength
	size: number
	weight: FontWeight
	anchor: "start" | "middle"
}

export type Section = {
	role: "label" | "value"
	box: Box
	icon: IconPlacement | null
	text: TextPlacement | null
}

export type BadgeLayout = {
	variant: Layout
	width: number
	height: number
	sections: Section[]
}

type Run = { text: string; width: number }

function fit(text: string, size: number, weight: FontWeight, cap: number): Run {
	const shown = truncateToWidth(text, cap, size, weight)
	return { text: shown, width: Math.ceil(measure(shown, size, weight)) }
}

// Centers capital letters in a row, snapped to half pixels.
function baseline(top: number, height: number, size: number): number {
	return top + Math.round((height / 2 + size * 0.36) * 2) / 2
}

function iconAt(
	name: string,
	x: number,
	top: number,
	height: number
): IconPlacement {
	return { name, x, y: top + (height - ICON) / 2, size: ICON }
}

function textAt(
	run: Run,
	x: number,
	top: number,
	height: number,
	size: number,
	weight: FontWeight,
	anchor: TextPlacement["anchor"]
): TextPlacement {
	return {
		text: run.text,
		x,
		y: baseline(top, height, size),
		width: run.width,
		size,
		weight,
		anchor
	}
}

// Icon and label text, either of them optional. Null when both are missing.
function labelSection(
	config: BadgeConfig,
	x: number,
	showText: boolean
): Section | null {
	const iconName = config.icon
	const run =
		showText && config.label !== ""
			? fit(config.label, FONT, 400, TEXT_CAP.label)
			: null

	let width: number
	let icon: IconPlacement | null = null
	let text: TextPlacement | null = null
	if (run === null) {
		if (iconName === null) return null
		width = PAD_ICON * 2 + ICON
		icon = iconAt(iconName, x + PAD_ICON, 0, ROW)
	} else if (iconName !== null) {
		width = PAD_ICON + ICON + GAP + run.width + PAD_TEXT
		icon = iconAt(iconName, x + PAD_ICON, 0, ROW)
		text = textAt(run, x + PAD_ICON + ICON + GAP, 0, ROW, FONT, 400, "start")
	} else {
		width = PAD_TEXT * 2 + run.width
		text = textAt(run, x + PAD_TEXT, 0, ROW, FONT, 400, "start")
	}
	return {
		role: "label",
		box: { x, y: 0, width, height: ROW },
		icon,
		text
	}
}

// The value as text. In the compact layout a status becomes its icon.
function valueSection(config: BadgeConfig, x: number, full: boolean): Section {
	const status = full ? null : statusOf(config.value)
	if (status !== null) {
		return {
			role: "value",
			box: { x, y: 0, width: PAD_ICON * 2 + ICON, height: ROW },
			icon: iconAt(STATUS_ICONS[status], x + PAD_ICON, 0, ROW),
			text: null
		}
	}

	const cap = full ? TEXT_CAP.value : TEXT_CAP.compactValue
	const run = fit(config.value, FONT, 600, cap)
	const width = PAD_TEXT * 2 + run.width
	return {
		role: "value",
		box: { x, y: 0, width, height: ROW },
		icon: null,
		text: textAt(run, x + width / 2, 0, ROW, FONT, 600, "middle")
	}
}

// full: [icon label | value]. compact: [icon | value], where a status
// value is shown as its icon.
function horizontal(
	config: BadgeConfig,
	variant: "full" | "compact"
): BadgeLayout {
	const full = variant === "full"
	const sections: Section[] = []
	let x = 0

	const label = labelSection(config, x, full)
	if (label !== null) {
		sections.push(label)
		x += label.box.width
	}
	const value = valueSection(config, x, full)
	sections.push(value)

	return { variant, width: x + value.box.width, height: ROW, sections }
}

// vertical: the icon (or the label when there is no icon) above the value.
function vertical(config: BadgeConfig): BadgeLayout {
	const iconName = config.icon
	const topRun =
		iconName === null && config.label !== ""
			? fit(config.label, FONT_SMALL, 400, TEXT_CAP.verticalText)
			: null
	const bottomRun = fit(config.value, FONT_SMALL, 600, TEXT_CAP.verticalText)

	let topWidth = 0
	if (iconName !== null) topWidth = ICON + PAD_ICON * 2
	else if (topRun !== null) topWidth = topRun.width + PAD_TEXT * 2
	const width = Math.max(topWidth, bottomRun.width + PAD_TEXT * 2)

	const sections: Section[] = []
	let y = 0
	if (iconName !== null || topRun !== null) {
		sections.push({
			role: "label",
			box: { x: 0, y: 0, width, height: ROW },
			icon:
				iconName === null
					? null
					: iconAt(iconName, Math.round((width - ICON) / 2), 0, ROW),
			text:
				topRun === null
					? null
					: textAt(topRun, width / 2, 0, ROW, FONT_SMALL, 400, "middle")
		})
		y = ROW
	}
	sections.push({
		role: "value",
		box: { x: 0, y, width, height: ROW_SMALL },
		icon: null,
		text: textAt(bottomRun, width / 2, y, ROW_SMALL, FONT_SMALL, 600, "middle")
	})

	return { variant: "vertical", width, height: y + ROW_SMALL, sections }
}

// Geometry of one layout variant. Pure: widths grow with the measured text,
// so the same config can be laid out as all three variants for <picture>.
export function layout(config: BadgeConfig, variant: Layout): BadgeLayout {
	switch (variant) {
		case "full":
		case "compact":
			return horizontal(config, variant)
		case "vertical":
			return vertical(config)
	}
}
