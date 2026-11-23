import { describe, expect, it } from "bun:test"

import { MAX_SVG_LENGTH, extractIconPath } from "./svg-path.js"

const svg = (inner: string, attrs = 'viewBox="0 0 24 24"') =>
	`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`

function ok(source: string) {
	const result = extractIconPath(source)
	if (!result.ok) throw new Error(result.error)
	return result
}

function error(source: string): string {
	const result = extractIconPath(source)
	if (result.ok) throw new Error("expected an error")
	return result.error
}

describe("extractIconPath: a plain filled icon", () => {
	it("takes the path as it is", () => {
		const result = ok(svg('<path d="M12 2L2 22h20z"/>'))
		expect(result.path).toBe("M12 2L2 22h20z")
		expect(result.stroke).toBeNull()
		expect(result.notes).toEqual([])
	})

	it("ignores title, desc, comments, the xml header and the doctype", () => {
		const source =
			'<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd">' +
			svg('<!-- a --><title>t</title><desc>d</desc><path d="M0 0h5v5z"></path>')
		expect(ok(source).path).toBe("M0 0h5v5z")
	})

	it("reads single-quoted attributes and a path inside a group", () => {
		const result = ok(
			svg("<g><path d='M0 0L1 1z'/></g>", "viewBox='0 0 24 24'")
		)
		expect(result.path).toBe("M0 0L1 1z")
	})

	it("reads fill and stroke written as a style attribute", () => {
		const result = ok(
			svg('<path style="fill:#000000;stroke:none" d="M0 0h5v5z"/>')
		)
		expect(result.path).toBe("M0 0h5v5z")
		expect(result.stroke).toBeNull()
	})

	it("skips editor data and hidden parts", () => {
		const source = svg(
			'<sodipodi:namedview id="a"/><defs><linearGradient id="g"/></defs><metadata><rdf:RDF/></metadata><path display="none" d="M9 9h9v9z"/><path d="M0 0h5v5z"/>'
		)
		expect(ok(source).path).toBe("M0 0h5v5z")
	})

	it("returns only path data, never markup", () => {
		const result = ok(
			svg(
				'<path onload="alert(1)" d="M0 0L1 1z"/><title>&lt;script&gt;</title>'
			)
		)
		expect(result.path).toBe("M0 0L1 1z")
	})
})

describe("extractIconPath: any size is fitted to the grid", () => {
	it("scales a bigger icon down", () => {
		const result = ok(
			svg('<path d="M256 0L512 512H0z"/>', 'viewBox="0 0 512 512"')
		)
		expect(result.path).toBe("M12 0L24 24H0z")
	})

	it("scales a smaller icon up", () => {
		const result = ok(
			svg('<path d="M8 0a8 8 0 1 1 0 16z"/>', 'viewBox="0 0 16 16"')
		)
		expect(result.path).toBe("M12 0a12 12 0 1 1 0 24z")
	})

	it("centers a non-square icon", () => {
		const result = ok(svg('<path d="M0 0h48v24z"/>', 'viewBox="0 0 48 24"'))
		expect(result.path).toBe("M0 6h24v12z")
	})

	it("honors a viewBox that does not start at zero", () => {
		const result = ok(svg('<path d="M10 10L20 20"/>', 'viewBox="10 10 10 10"'))
		expect(result.path).toBe("M0 0L24 24")
	})

	it("uses width and height when there is no viewBox", () => {
		const result = ok(svg('<path d="M0 0L5 5z"/>', 'width="48px" height="48"'))
		expect(result.path).toBe("M0 0L2.5 2.5z")
	})

	it("scales only relative sizes and shifts absolute points", () => {
		const result = ok(
			svg('<path d="m4 4 h4 v4 z M2 2 l1 1"/>', 'viewBox="0 0 48 48"')
		)
		expect(result.path).toBe("M2 2h2v2zM1 1l0.5 0.5")
	})

	it("keeps arc flags and the turn untouched", () => {
		const result = ok(
			svg('<path d="M0 0a4 2 30 1 1 4 4"/>', 'viewBox="0 0 48 48"')
		)
		expect(result.path).toBe("M0 0a2 1 30 1 1 2 2")
	})

	it.each([
		["", "no size"],
		['viewBox="0 0 0 0"', "empty"],
		['viewBox="a b c d"', "viewBox"],
		['width="2em" height="2em"', "units"]
	])("explains an unusable size: %s", (attrs, word) => {
		expect(error(svg('<path d="M0 0L1 1z"/>', attrs))).toContain(word)
	})
})

describe("extractIconPath: many parts become one path", () => {
	it("merges several paths", () => {
		const result = ok(svg('<path d="M0 0h5v5z"/><path d="m10 10h5v5z"/>'))
		expect(result.path).toBe("M0 0h5v5zM10 10h5v5z")
	})

	it("turns shapes into path commands", () => {
		const result = ok(
			svg(
				'<rect x="1" y="2" width="4" height="3"/><circle cx="12" cy="12" r="2"/><polygon points="0,0 4,0 4,4"/>'
			)
		)
		expect(result.path).toBe(
			"M1 2H5V5H1ZM10 12A2 2 0 1 0 14 12 2 2 0 1 0 10 12ZM0 0L4 0 4 4Z"
		)
	})

	it("rounds the corners of a rect", () => {
		const result = ok(svg('<rect width="10" height="10" rx="2"/>'))
		expect(result.path).toContain("A2 2 0 0 1")
	})

	it("applies transforms of groups and elements", () => {
		const result = ok(
			svg(
				'<g transform="translate(2 3) scale(2)"><path transform="translate(1)" d="M0 0L1 1"/></g>'
			)
		)
		expect(result.path).toBe("M4 3L6 5")
	})

	it("accepts a matrix of scale and shift", () => {
		const result = ok(
			svg('<path transform="matrix(2 0 0 2 1 1)" d="M0 0L1 1"/>')
		)
		expect(result.path).toBe("M1 1L3 3")
	})

	it.each([
		["rotate(45)", "rotate"],
		["skewX(10)", "skewx"],
		["scale(2 3)", "Stretching"],
		["scale(-1)", "Flipping"],
		["matrix(1 1 0 1 0 0)", "Rotating"],
		["nonsense", "could not be read"]
	])("refuses the transform %s", (transform, word) => {
		const message = error(svg(`<path transform="${transform}" d="M0 0L1 1z"/>`))
		expect(message.toLowerCase()).toContain(word.toLowerCase())
	})
})

describe("extractIconPath: outline icons", () => {
	const lucide = (inner: string) =>
		svg(
			inner,
			'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
		)

	it("keeps the line width of the svg", () => {
		const result = ok(lucide('<path d="m9 12 2 2 4-4"/>'))
		expect(result.path).toBe("M9 12l2 2 4 -4")
		expect(result.stroke).toBe(2)
		expect(result.notes).toEqual([])
	})

	it("merges lines and shapes of an outline icon", () => {
		const result = ok(
			lucide(
				'<circle cx="12" cy="12" r="10"/><line x1="3" y1="3" x2="5" y2="5"/><polyline points="1 1 2 2 3 1"/>'
			)
		)
		expect(result.stroke).toBe(2)
		expect(result.path).toContain("M3 3L5 5")
		expect(result.path).toContain("M1 1L2 2 3 1")
	})

	it("scales the line width with the icon", () => {
		const result = ok(
			svg(
				'<path d="M0 0L16 16"/>',
				'viewBox="0 0 48 48" fill="none" stroke="#000" stroke-width="4"'
			)
		)
		expect(result.stroke).toBe(2)
	})

	it("defaults to a line width of 1", () => {
		const result = ok(svg('<path fill="none" stroke="#000" d="M0 0L5 5"/>'))
		expect(result.stroke).toBe(1)
	})

	it("ignores the empty box that some sets add", () => {
		const result = ok(
			lucide(
				'<path stroke="none" fill="none" d="M0 0h24v24H0z"/><path d="M5 12h14"/>'
			)
		)
		expect(result.path).toBe("M5 12h14")
	})

	it("draws a lone line only as an outline", () => {
		expect(error(svg('<line x1="0" y1="0" x2="5" y2="5"/>'))).toContain(
			"Nothing to draw"
		)
	})

	it("notes ends that are not round and different widths", () => {
		const caps = ok(
			svg(
				'<path stroke-linecap="square" d="M0 0L5 5"/>',
				'viewBox="0 0 24 24" fill="none" stroke="#000"'
			)
		)
		expect(caps.notes.join(" ")).toContain("round")
		const widths = ok(
			lucide('<path stroke-width="1" d="M0 0L5 5"/><path d="M5 5L9 9"/>')
		)
		expect(widths.notes.join(" ")).toContain("different widths")
	})

	it("refuses a line width the service would not take", () => {
		const message = error(
			svg(
				'<path d="M0 0L5 5"/>',
				'viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="20"'
			)
		)
		expect(message).toContain("line width")
	})

	it("refuses an icon that mixes filled and outlined parts", () => {
		expect(
			error(
				svg(
					'<path d="M0 0h5v5z"/><path fill="none" stroke="#000" d="M9 9h5v5z"/>'
				)
			)
		).toContain("mixes")
	})
})

describe("extractIconPath: what is not supported", () => {
	it("refuses a file that is not an svg", () => {
		expect(error("hello")).toContain("not an SVG")
		expect(error('<html><path d="M0 0z"/></html>')).toContain("not an SVG")
		expect(error("")).toContain("not an SVG")
	})

	it("refuses a svg without anything to draw", () => {
		expect(error(svg("<title>x</title>"))).toContain("Nothing to draw")
		expect(error(svg("<path/>"))).toContain("Nothing to draw")
	})

	it.each([
		"script",
		"style",
		"image",
		"use",
		"foreignObject",
		"text",
		"linearGradient"
	])("refuses <%s>", (name) => {
		const inner = `<${name}>x</${name}><path d="M0 0L1 1z"/>`
		expect(error(svg(inner))).toContain(`<${name.toLowerCase()}>`)
	})

	it("refuses gradients, clips, masks and filters", () => {
		expect(error(svg('<path fill="url(#a)" d="M0 0L1 1z"/>'))).toContain(
			"Gradients"
		)
		expect(error(svg('<path clip-path="url(#a)" d="M0 0L1 1z"/>'))).toContain(
			"clip-path"
		)
		expect(error(svg('<path filter="url(#a)" d="M0 0L1 1z"/>'))).toContain(
			"filter"
		)
	})

	it("refuses an svg inside an svg and entity declarations", () => {
		expect(error(svg(svg('<path d="M0 0L1 1z"/>')))).toContain("inside")
		const source =
			'<!DOCTYPE svg [<!ENTITY x "y">]>' + svg('<path d="M0 0L1 1z"/>')
		expect(error(source)).toContain("Entity")
	})

	it("refuses broken path data", () => {
		expect(error(svg('<path d="M0 0 X1 1"/>'))).toContain("could not be read")
		expect(error(svg('<path d="L0 0"/>'))).toContain("could not be read")
		expect(error(svg('<path d="M0 0 L"/>'))).toContain("could not be read")
	})

	it("refuses a drawing far outside the icon area", () => {
		expect(error(svg('<path d="M0 0 L5000 0"/>'))).toContain("outside")
	})

	it("refuses a file over the size limit", () => {
		const big = svg(`<path d="M0 0L1 1z"/>${" ".repeat(MAX_SVG_LENGTH)}`)
		expect(error(big)).toContain("too big")
	})
})

describe("extractIconPath: length", () => {
	it("uses fewer decimals for a path that is a little too long", () => {
		const d = "M0.123456 0.123456" + "L1.123456 1.123456".repeat(30)
		expect(d.length).toBeGreaterThan(500)
		const result = ok(svg(`<path d="${d}"/>`))
		expect(result.path.length).toBeLessThanOrEqual(500)
	})

	it("rounds paths with arcs as well", () => {
		const d =
			"M0 0a1.123456 1.123456 0 011.123456 1.123456" + "l1.5 1.5".repeat(60)
		const result = ok(svg(`<path d="${d}"/>`))
		expect(result.path.length).toBeLessThanOrEqual(500)
	})

	it("says how long a hopelessly long path is", () => {
		const d = "M0 0" + "L1 1L2 2".repeat(200)
		expect(error(svg(`<path d="${d}"/>`))).toContain("limit is 500")
	})
})

describe("extractIconPath: notes", () => {
	it("notes what will be ignored", () => {
		const evenodd = ok(svg('<path fill-rule="evenodd" d="M0 0L1 1z"/>'))
		expect(evenodd.notes.join(" ")).toContain("evenodd")
		const color = ok(svg('<path fill="#ff0000" d="M0 0L1 1z"/>'))
		expect(color.notes.join(" ")).toContain("color")
		const stroke = ok(svg('<path stroke="#000" d="M0 0L1 1z"/>'))
		expect(stroke.notes.join(" ")).toContain("stroke")
	})

	it("stays quiet about black and currentColor", () => {
		for (const fill of ["currentColor", "#000", "black"]) {
			expect(ok(svg(`<path fill="${fill}" d="M0 0L1 1z"/>`)).notes).toEqual([])
		}
	})
})
