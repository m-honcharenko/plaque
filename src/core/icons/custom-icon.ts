// A custom icon is one SVG path (the `d` attribute) drawn on a 24x24 grid.
// Plaque takes path data and never a whole SVG file: a badge URL can be
// opened directly, so anything beyond plain drawing commands (script,
// handlers, links, styles) would run on this origin.

export const ICON_PATH_MAX_LENGTH = 500
// Icons live on a 24x24 grid; the renderer clips whatever sticks out, this
// only keeps absurd numbers out.
export const ICON_PATH_MAX_NUMBER = 100
export const CUSTOM_ICON_SIZE = 24
export const CUSTOM_ICON_NAME = "custom"

// How many numbers each command takes. An arc has two flags (0 or 1) that
// may be glued to the next number, so it is parsed separately.
const ARGUMENTS: Readonly<Record<string, number>> = {
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

const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)/y
const SEPARATOR = /[\s,]*/y

class Reader {
	pos = 0
	// What was read so far, one token each: the canonical form of the path.
	readonly tokens: string[] = []

	constructor(readonly text: string) {}

	skipSeparators(): void {
		SEPARATOR.lastIndex = this.pos
		SEPARATOR.exec(this.text)
		this.pos = SEPARATOR.lastIndex
	}

	done(): boolean {
		this.skipSeparators()
		return this.pos >= this.text.length
	}

	peek(): string {
		return this.text.charAt(this.pos)
	}

	number(): number | null {
		this.skipSeparators()
		NUMBER.lastIndex = this.pos
		const match = NUMBER.exec(this.text)
		if (match === null) return null
		this.pos = NUMBER.lastIndex
		const value = Number(match[0])
		if (Math.abs(value) > ICON_PATH_MAX_NUMBER) return null
		this.tokens.push(match[0])
		return value
	}

	flag(): boolean {
		this.skipSeparators()
		const char = this.peek()
		if (char !== "0" && char !== "1") return false
		this.pos += 1
		this.tokens.push(char)
		return true
	}
}

function readArguments(reader: Reader, command: string): boolean {
	if (command === "a") {
		return (
			reader.number() !== null &&
			reader.number() !== null &&
			reader.number() !== null &&
			reader.flag() &&
			reader.flag() &&
			reader.number() !== null &&
			reader.number() !== null
		)
	}
	for (let i = 0; i < (ARGUMENTS[command] ?? 0); i += 1) {
		if (reader.number() === null) return false
	}
	return true
}

// The path in a compact canonical form, or null when it
// is not a plain, well-formed path of drawing commands.
export function parseIconPath(raw: string): string | null {
	const text = raw.trim()
	if (text === "" || text.length > ICON_PATH_MAX_LENGTH) return null

	const reader = new Reader(text)
	let command = ""
	let first = true

	while (!reader.done()) {
		const char = reader.peek()
		const lower = char.toLowerCase()
		if (Object.hasOwn(ARGUMENTS, lower) && /[a-zA-Z]/.test(char)) {
			if (first && lower !== "m") return null
			command = lower
			reader.pos += 1
			reader.tokens.push(char)
			if (lower === "z") continue
		} else if (command === "" || command === "z") {
			// Numbers need a command to belong to (and Z takes none).
			return null
		}
		first = false

		if (command !== "z" && !readArguments(reader, command)) return null
	}
	if (first) return null
	const canonical = join(reader.tokens)
	// Re-submitting the canonical form must pass too (the snippet does).
	return canonical.length <= ICON_PATH_MAX_LENGTH ? canonical : null
}

// Command letters stick to what follows, numbers are told apart by a space.
function join(tokens: readonly string[]): string {
	let out = ""
	let afterNumber = false
	for (const token of tokens) {
		const isCommand = /^[a-zA-Z]$/.test(token)
		out += (afterNumber && !isCommand ? " " : "") + token
		afterNumber = !isCommand
	}
	return out
}

export function isIconPath(raw: string): boolean {
	return parseIconPath(raw) !== null
}
