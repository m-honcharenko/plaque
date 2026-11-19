import { describe, expect, it } from "bun:test"

import { renderInvalidParamsBadge } from "./error-badge.js"

describe("renderInvalidParamsBadge", () => {
	it("renders an svg with the error text and the error color", () => {
		const svg = renderInvalidParamsBadge()
		expect(svg.startsWith("<svg")).toBe(true)
		expect(svg).toContain("error: invalid params")
		expect(svg).toContain("#cf222e")
	})
})
