import {
	CUSTOM_ICON_SIZE,
	ICON_PATH_MAX_LENGTH,
	ICON_PATH_MAX_NUMBER,
	ICON_STROKE_RANGE,
	parseIconPath,
	parseIconStroke
} from "../../src/core/icons/custom-icon.js"

// Turns an SVG file into what the service accepts as an icon: path data on a
// 24x24 grid, plus a line width when the icon is an outline. The file is
// only read as text here, never put into the page. Every shape is converted
// to path commands, scaled to the grid and merged into one path; only that
// checked path leaves this module.

export const MAX_SVG_LENGTH = 100_000

export type IconExtraction =
	| { ok: true; path: string; stroke: number | null; notes: string[] }
	| { ok: false; error: string }

class Unsupported extends Error {}

function fail(message: string): never {
	throw new Unsupported(message)
}

// ---- reading the markup ---------------------------------------------------

type Attrs = Record<string, string>
type Tag = { kind: "open" | "close" | "self"; name: string; attrs: Attrs }

const TAG = /<\s*(\/?)\s*([a-zA-Z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g
const ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

function scanTags(text: string): Tag[] {
	const tags: Tag[] = []
	for (const match of text.matchAll(TAG)) {
		const rest = match[3] ?? ""
		const attrs: Attrs = {}
		for (const attr of rest.matchAll(ATTR)) {
			attrs[(attr[1] ?? "").toLowerCase()] = attr[2] ?? attr[3] ?? ""
		}
		let kind: Tag["kind"] = "open"
		if (match[1] === "/") kind = "close"
		else if (rest.trimEnd().endsWith("/")) kind = "self"
		tags.push({ kind, name: (match[2] ?? "").toLowerCase(), attrs })
	}
	return tags
}

function stripNoise(text: string): string {
	return text
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
		.replace(/<\?[\s\S]*?\?>/g, "")
		.replace(/<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>/gi, "")
}

const NUMBER_TEXT = "[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?"
const NUMBER = new RegExp(NUMBER_TEXT, "y")
const NUMBERS = new RegExp(NUMBER_TEXT, "g")
const LENGTH = new RegExp(`^(${NUMBER_TEXT})(?:px)?$`)

// A plain number, optionally in px. Other units depend on the page, so
// they cannot become grid units.
function length(raw: string | undefined, fallback?: number): number {
	if (raw === undefined) {
		if (fallback === undefined)
			return fail("The SVG has no size: add a viewBox.")
		return fallback
	}
	const match = LENGTH.exec(raw.trim())
	if (match === null) {
		return fail(`"${raw}" is not a plain number: use numbers without units.`)
	}
	return Number(match[1])
}

// ---- style ------------------------------------------------------------------

const INHERITED = [
	"fill",
	"stroke",
	"stroke-width",
	"fill-rule",
	"stroke-linecap",
	"stroke-linejoin",
	"visibility"
] as const
const FROM_STYLE = new Set<string>([...INHERITED, "display"])

type Style = Partial<Record<(typeof INHERITED)[number], string>>

// style="fill:#000;stroke:none" counts like the attributes, and wins.
function withStyle(attrs: Attrs): Attrs {
	const css = attrs.style
	if (css === undefined) return attrs
	const merged = { ...attrs }
	for (const part of css.split(";")) {
		const colon = part.indexOf(":")
		if (colon < 0) continue
		const name = part.slice(0, colon).trim().toLowerCase()
		if (FROM_STYLE.has(name)) merged[name] = part.slice(colon + 1).trim()
	}
	return merged
}

function inherit(parent: Style, attrs: Attrs): Style {
	const style: Style = { ...parent }
	for (const name of INHERITED) {
		const value = attrs[name]
		if (value !== undefined && value.trim() !== "inherit") {
			style[name] = value.trim()
		}
	}
	return style
}

// ---- positions: scale and shift only -----------------------------------------

// x' = k * x + tx, y' = k * y + ty. Rotation and skew would turn arcs into
// something a path cannot say with the same commands.
type Matrix = { k: number; tx: number; ty: number }

const IDENTITY: Matrix = { k: 1, tx: 0, ty: 0 }

function compose(outer: Matrix, inner: Matrix): Matrix {
	return {
		k: outer.k * inner.k,
		tx: outer.k * inner.tx + outer.tx,
		ty: outer.k * inner.ty + outer.ty
	}
}

const TRANSFORM = /([a-zA-Z]+)\s*\(([^)]*)\)/g

function parseTransform(raw: string | undefined): Matrix {
	if (raw === undefined || raw.trim() === "") return IDENTITY
	if (raw.replace(TRANSFORM, "").replace(/[\s,]/g, "") !== "") {
		fail("This transform could not be read. Apply it in your editor.")
	}
	let result = IDENTITY
	for (const match of raw.matchAll(TRANSFORM)) {
		const name = (match[1] ?? "").toLowerCase()
		const values = (match[2] ?? "").match(NUMBERS)?.map(Number) ?? []
		const a = values[0] ?? 0
		const b = values[1]
		let next: Matrix
		if (name === "translate") {
			next = { k: 1, tx: a, ty: b ?? 0 }
		} else if (name === "scale") {
			if (b !== undefined && b !== a) {
				fail("Stretching (different x and y scale) is not supported.")
			}
			next = { k: a, tx: 0, ty: 0 }
		} else if (name === "matrix" && values.length === 6) {
			if (values[1] !== 0 || values[2] !== 0 || a !== values[3]) {
				fail("Rotating, skewing and stretching are not supported.")
			}
			next = { k: a, tx: values[4] ?? 0, ty: values[5] ?? 0 }
		} else {
			fail(`${name}() is not supported. Apply it in your editor.`)
		}
		if (!(next.k > 0)) fail("Flipping or collapsing a shape is not supported.")
		result = compose(result, next)
	}
	return result
}

// The picture is fitted into the grid the way a browser fits a viewBox into
// a square: uniformly, centered. Bigger and smaller icons both end up here.
function viewport(svg: Attrs): Matrix {
	let minX = 0
	let minY = 0
	let width: number
	let height: number
	if (svg.viewbox !== undefined) {
		const parts = svg.viewbox
			.trim()
			.split(/[\s,]+/)
			.map(Number)
		if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
			fail(`The viewBox "${svg.viewbox}" could not be read.`)
		}
		minX = parts[0] ?? 0
		minY = parts[1] ?? 0
		width = parts[2] ?? 0
		height = parts[3] ?? 0
	} else {
		width = length(svg.width)
		height = length(svg.height)
	}
	if (!(width > 0 && height > 0)) fail("The SVG has an empty size.")
	const k = CUSTOM_ICON_SIZE / Math.max(width, height)
	return {
		k,
		tx: (CUSTOM_ICON_SIZE - width * k) / 2 - minX * k,
		ty: (CUSTOM_ICON_SIZE - height * k) / 2 - minY * k
	}
}

// ---- path data ---------------------------------------------------------------

type Command = { c: string; a: number[] }

const COUNTS: Readonly<Record<string, number>> = {
	m: 2,
	l: 2,
	h: 1,
	v: 1,
	c: 6,
	s: 4,
	q: 4,
	t: 2,
	a: 7,
	z: 0
}

function command(c: string, ...a: number[]): Command {
	return { c, a }
}

// Splits path data into single commands: repeated groups become their own
// commands (an extra pair after M is a line), and a leading m is absolute.
function parsePath(d: string): Command[] {
	const bad = (): never => fail("The path data of a <path> could not be read.")
	const commands: Command[] = []
	let pos = 0
	let current = ""
	const skip = () => {
		while (pos < d.length && /[\s,]/.test(d.charAt(pos))) pos += 1
	}
	const read = (): number => {
		skip()
		NUMBER.lastIndex = pos
		const match = NUMBER.exec(d)
		if (match === null) return bad()
		pos = NUMBER.lastIndex
		return Number(match[0])
	}
	const flag = (): number => {
		skip()
		const char = d.charAt(pos)
		if (char !== "0" && char !== "1") return bad()
		pos += 1
		return Number(char)
	}

	for (;;) {
		skip()
		if (pos >= d.length) break
		const char = d.charAt(pos)
		let isNew = false
		if (/[a-zA-Z]/.test(char)) {
			if (!Object.hasOwn(COUNTS, char.toLowerCase())) bad()
			current = char
			pos += 1
			isNew = true
		} else if (current === "" || current.toLowerCase() === "z") {
			bad()
		}
		const lower = current.toLowerCase()
		if (commands.length === 0 && lower !== "m") bad()

		if (lower === "z") {
			commands.push(command(current))
			continue
		}
		const args: number[] = []
		if (lower === "a") {
			args.push(read(), read(), read(), flag(), flag(), read(), read())
		} else {
			for (let i = 0; i < (COUNTS[lower] ?? 0); i += 1) args.push(read())
		}
		let letter = current
		if (lower === "m" && !isNew) letter = current === "m" ? "l" : "L"
		// The very first m is relative to (0, 0): the same as an absolute M.
		if (commands.length === 0) letter = "M"
		commands.push(command(letter, ...args))
	}
	if (commands.length === 0) bad()
	return commands
}

// Moves a path into grid units. Absolute coordinates scale and shift,
// relative ones only scale.
function place(commands: Command[], matrix: Matrix): Command[] {
	const { k, tx, ty } = matrix
	return commands.map(({ c, a }) => {
		const absolute = c === c.toUpperCase()
		const x = (value: number) => (absolute ? value * k + tx : value * k)
		const y = (value: number) => (absolute ? value * k + ty : value * k)
		const upper = c.toUpperCase()
		if (upper === "Z") return command(c)
		if (upper === "H") return command(c, x(a[0] ?? 0))
		if (upper === "V") return command(c, y(a[0] ?? 0))
		if (upper === "A") {
			return command(
				c,
				(a[0] ?? 0) * k,
				(a[1] ?? 0) * k,
				a[2] ?? 0,
				a[3] ?? 0,
				a[4] ?? 0,
				x(a[5] ?? 0),
				y(a[6] ?? 0)
			)
		}
		return command(
			c,
			...a.map((value, index) => (index % 2 === 0 ? x(value) : y(value)))
		)
	})
}

// A letter is repeated only where leaving it out would change the meaning:
// after M a bare pair is a line, and Z takes nothing to continue with.
function format(commands: readonly Command[], digits: number): string {
	let out = ""
	let previous = ""
	for (const { c, a } of commands) {
		const numbers = a.map((value) => String(Number(value.toFixed(digits))))
		const same = c === previous && !"mMzZ".includes(c)
		out += `${same ? " " : c}${numbers.join(" ")}`
		previous = c
	}
	return out
}

// ---- shapes ------------------------------------------------------------------

function polygonPoints(raw: string | undefined): number[] {
	const numbers = (raw ?? "").match(NUMBERS)?.map(Number) ?? []
	if (numbers.length < 4) return []
	return numbers.slice(0, numbers.length - (numbers.length % 2))
}

function rectangle(a: Attrs): Command[] {
	const x = length(a.x, 0)
	const y = length(a.y, 0)
	const w = length(a.width, 0)
	const h = length(a.height, 0)
	if (!(w > 0 && h > 0)) return []
	let rx = a.rx === undefined ? undefined : length(a.rx)
	let ry = a.ry === undefined ? undefined : length(a.ry)
	rx ??= ry ?? 0
	ry ??= rx
	rx = Math.min(rx, w / 2)
	ry = Math.min(ry, h / 2)
	if (rx <= 0 || ry <= 0) {
		return [
			command("M", x, y),
			command("H", x + w),
			command("V", y + h),
			command("H", x),
			command("Z")
		]
	}
	return [
		command("M", x + rx, y),
		command("H", x + w - rx),
		command("A", rx, ry, 0, 0, 1, x + w, y + ry),
		command("V", y + h - ry),
		command("A", rx, ry, 0, 0, 1, x + w - rx, y + h),
		command("H", x + rx),
		command("A", rx, ry, 0, 0, 1, x, y + h - ry),
		command("V", y + ry),
		command("A", rx, ry, 0, 0, 1, x + rx, y),
		command("Z")
	]
}

function shapeCommands(name: string, a: Attrs): Command[] {
	if (name === "path") {
		return a.d === undefined || a.d.trim() === "" ? [] : parsePath(a.d)
	}
	if (name === "rect") return rectangle(a)
	if (name === "circle" || name === "ellipse") {
		const cx = length(a.cx, 0)
		const cy = length(a.cy, 0)
		const rx = length(name === "circle" ? a.r : a.rx, 0)
		const ry = name === "circle" ? rx : length(a.ry, 0)
		if (!(rx > 0 && ry > 0)) return []
		return [
			command("M", cx - rx, cy),
			command("A", rx, ry, 0, 1, 0, cx + rx, cy),
			command("A", rx, ry, 0, 1, 0, cx - rx, cy),
			command("Z")
		]
	}
	if (name === "line") {
		return [
			command("M", length(a.x1, 0), length(a.y1, 0)),
			command("L", length(a.x2, 0), length(a.y2, 0))
		]
	}
	// polyline and polygon
	const points = polygonPoints(a.points)
	const commands: Command[] = []
	for (let i = 0; i < points.length; i += 2) {
		commands.push(
			command(i === 0 ? "M" : "L", points[i] ?? 0, points[i + 1] ?? 0)
		)
	}
	if (name === "polygon" && commands.length > 0) commands.push(command("Z"))
	return commands
}

// ---- walking the document -------------------------------------------------------

const SHAPES = new Set([
	"path",
	"rect",
	"circle",
	"ellipse",
	"line",
	"polyline",
	"polygon"
])
const CONTAINERS = new Set(["svg", "g"])
// Their content is never drawn (or is only editor data).
const NOT_DRAWN = new Set(["title", "desc", "metadata", "defs"])
const EDITOR_PREFIX = /^(?:sodipodi|inkscape|rdf|cc|dc):/

type Frame = { style: Style; matrix: Matrix; skip: boolean }

type Piece = {
	commands: Command[]
	mode: "fill" | "line"
	width: number
	evenodd: boolean
	ownColor: boolean
	strokeIgnored: boolean
	notRound: boolean
}

const PLAIN_INK = new Set(["currentcolor", "black", "#000", "#000000"])

function piece(
	name: string,
	attrs: Attrs,
	style: Style,
	matrix: Matrix
): Piece | null {
	const fill = (style.fill ?? "black").toLowerCase()
	const stroke = style.stroke?.toLowerCase()
	if (fill.includes("url(") || stroke?.includes("url(")) {
		fail("Gradients and patterns are not supported.")
	}
	if (style.visibility === "hidden" || style.visibility === "collapse") {
		return null
	}
	const filled = fill !== "none"
	const stroked = stroke !== undefined && stroke !== "none"
	// A line has no inside: it only shows when it is drawn as an outline.
	if (!filled && !stroked) return null
	if (filled && name === "line") return null

	const commands = shapeCommands(name, attrs)
	if (commands.length === 0) return null

	const cap = style["stroke-linecap"]
	const join = style["stroke-linejoin"]
	return {
		commands: place(commands, matrix),
		mode: filled ? "fill" : "line",
		width: length(style["stroke-width"], 1) * matrix.k,
		evenodd: style["fill-rule"]?.toLowerCase() === "evenodd",
		ownColor: filled && !PLAIN_INK.has(fill),
		strokeIgnored: filled && stroked,
		notRound:
			(cap !== undefined && cap !== "round") ||
			(join !== undefined && join !== "round")
	}
}

function collect(tags: readonly Tag[]): Piece[] {
	const root = tags[0]
	if (root === undefined || root.kind === "close" || root.name !== "svg") {
		fail("This is not an SVG: it has to start with <svg>.")
	}
	const pieces: Piece[] = []
	const stack: Frame[] = []
	const skipped: Frame = { style: {}, matrix: IDENTITY, skip: true }

	for (const tag of tags) {
		if (tag.kind === "close") {
			stack.pop()
			continue
		}
		// Every opening tag gets a frame, so closing tags always match one.
		const enter = (frame: Frame) => {
			if (tag.kind === "open") stack.push(frame)
		}
		const parent = stack.at(-1)
		if (
			parent?.skip === true ||
			NOT_DRAWN.has(tag.name) ||
			EDITOR_PREFIX.test(tag.name)
		) {
			enter(skipped)
			continue
		}
		if (tag.name === "svg" && parent !== undefined) {
			fail("An SVG inside an SVG is not supported.")
		}
		if (!CONTAINERS.has(tag.name) && !SHAPES.has(tag.name)) {
			fail(
				tag.name === "style" || tag.name === "script"
					? `<${tag.name}> is not supported: put fill and stroke on the shapes themselves.`
					: `<${tag.name}> is not supported: the icon has to be made of paths and basic shapes.`
			)
		}
		const attrs = withStyle(tag.attrs)
		if (attrs.display?.trim() === "none") {
			enter(skipped)
			continue
		}
		for (const name of ["clip-path", "mask", "filter"]) {
			const value = attrs[name]
			if (value !== undefined && value.trim() !== "none") {
				fail(`${name} is not supported.`)
			}
		}

		const own = parseTransform(attrs.transform)
		const matrix =
			parent === undefined
				? compose(viewport(attrs), own)
				: compose(parent.matrix, own)
		const style = inherit(parent?.style ?? {}, attrs)
		if (SHAPES.has(tag.name)) {
			const found = piece(tag.name, attrs, style, matrix)
			if (found !== null) pieces.push(found)
		}
		enter({ style, matrix, skip: false })
	}
	return pieces
}

// The drawing as one path, with as few decimals as the length limit needs.
function fit(commands: readonly Command[]): { path: string; digits: number } {
	for (const value of commands.flatMap((entry) => entry.a)) {
		if (!Number.isFinite(value) || Math.abs(value) > ICON_PATH_MAX_NUMBER) {
			fail("Part of the drawing lies far outside the icon area.")
		}
	}
	for (const digits of [3, 2, 1, 0]) {
		const path = parseIconPath(format(commands, digits))
		if (path !== null) return { path, digits }
	}
	const size = format(commands, 0).length
	return fail(
		`The drawing is too detailed: about ${size} characters, the limit is ${ICON_PATH_MAX_LENGTH}. Simplify it in your editor.`
	)
}

function extract(source: string): IconExtraction {
	if (source.length > MAX_SVG_LENGTH) {
		fail("The file is too big for an icon (over 100 KB).")
	}
	if (/<!ENTITY/i.test(source)) fail("Entity declarations are not supported.")

	const pieces = collect(scanTags(stripNoise(source)))
	if (pieces.length === 0) {
		fail("Nothing to draw: no path or shape with a fill or an outline.")
	}
	if (new Set(pieces.map((entry) => entry.mode)).size > 1) {
		fail(
			"This icon mixes filled and outlined parts. Plaque draws one or the other: make all parts filled or all outlined."
		)
	}
	const outline = pieces[0]?.mode === "line"

	const { path, digits } = fit(pieces.flatMap((entry) => entry.commands))
	const notes: string[] = []
	if (digits < 2) {
		notes.push(
			"Numbers were rounded to fit the length limit, so check the preview."
		)
	}

	let stroke: number | null = null
	if (outline) {
		const widths = pieces.map((entry) => Number(entry.width.toFixed(2)))
		const first = widths[0] ?? 0
		stroke = parseIconStroke(first)
		if (stroke === null) {
			fail(
				`The line width ${first} is outside the allowed ${ICON_STROKE_RANGE.min} to ${ICON_STROKE_RANGE.max}.`
			)
		}
		if (widths.some((width) => Math.abs(width - first) > 0.01)) {
			notes.push(`The lines have different widths, ${first} is used for all.`)
		}
		if (pieces.some((entry) => entry.notRound)) {
			notes.push("Line ends and corners are always drawn round.")
		}
	} else {
		if (pieces.some((entry) => entry.evenodd)) {
			notes.push(
				"fill-rule evenodd is ignored, so holes in the shape may come out filled. Check the preview."
			)
		}
		if (pieces.some((entry) => entry.ownColor)) {
			notes.push(
				"The icon takes the color of the badge theme, its own color is ignored."
			)
		}
		if (pieces.some((entry) => entry.strokeIgnored)) {
			notes.push("The outline (stroke) is ignored, only the fill is drawn.")
		}
	}
	return { ok: true, path, stroke, notes }
}

export function extractIconPath(source: string): IconExtraction {
	try {
		return extract(source)
	} catch (error) {
		if (error instanceof Unsupported) {
			return { ok: false, error: error.message }
		}
		throw error
	}
}
