import { describe, expect, it } from "bun:test"

import {
	cleanOrigin,
	defaultState,
	validate,
	type BuilderState,
	type ColorChoice
} from "./builder-state.js"

const base = defaultState("https://plaque.example")

function choice(
	mode: ColorChoice["mode"],
	patch: Partial<ColorChoice> = {}
): ColorChoice {
	return { mode, token: "success", hex: "1a7f37", ...patch }
}

function withState(patch: Partial<BuilderState>): BuilderState {
	return { ...base, ...patch }
}

describe("validate", () => {
	it("accepts the default state", () => {
		const result = validate(base)
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.config.value).toBe("passing")
			expect(result.config.icon).toBe("workflow")
			expect(result.breakpoint).toBe(600)
		}
	})

	it("requires a value", () => {
		const result = validate(withState({ value: "   " }))
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.errors.value).toBeDefined()
	})

	it("limits label and value to 24 characters", () => {
		const long = "x".repeat(25)
		const result = validate(withState({ label: long, value: long }))
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors.label).toBeDefined()
			expect(result.errors.value).toBeDefined()
		}
	})

	it("allows an empty label", () => {
		expect(validate(withState({ label: "" })).ok).toBe(true)
	})

	it("uses a token color in token mode", () => {
		const result = validate(
			withState({ valueColor: choice("token", { token: "error" }) })
		)
		expect(result.ok && result.config.color).toEqual({
			type: "token",
			name: "error"
		})
	})

	it("uses a lowercase hex color in custom mode", () => {
		const result = validate(
			withState({ valueColor: choice("custom", { hex: "1A7F37" }) })
		)
		expect(result.ok && result.config.color).toEqual({
			type: "hex",
			value: "1a7f37"
		})
	})

	it("rejects a bad hex only in custom mode", () => {
		expect(
			validate(withState({ valueColor: choice("custom", { hex: "12" }) })).ok
		).toBe(false)
		expect(
			validate(withState({ valueColor: choice("token", { hex: "12" }) })).ok
		).toBe(true)
	})

	it("accepts no icon", () => {
		const result = validate(withState({ icon: null }))
		expect(result.ok && result.config.icon).toBeNull()
	})

	it("rejects an unknown icon", () => {
		expect(validate(withState({ icon: "nope" })).ok).toBe(false)
	})

	it("keeps the breakpoint inside 320..1200", () => {
		expect(validate(withState({ breakpoint: 320 })).ok).toBe(true)
		expect(validate(withState({ breakpoint: 1200 })).ok).toBe(true)
		expect(validate(withState({ breakpoint: 319 })).ok).toBe(false)
		expect(validate(withState({ breakpoint: 1201 })).ok).toBe(false)
		expect(validate(withState({ breakpoint: 600.5 })).ok).toBe(false)
	})

	it("rejects a bad service URL", () => {
		const result = validate(withState({ origin: "not a url" }))
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.errors.origin).toBeDefined()
	})
})

describe("validate with a custom icon", () => {
	const custom = (patch: Partial<BuilderState> = {}) =>
		withState({ iconSource: "custom", customPath: "M12 2L2 22h20z", ...patch })

	it("uses the custom path and drops the library icon", () => {
		const result = validate(custom({ icon: "check" }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.config.iconPath).toBe("M12 2L2 22h20z")
			expect(result.config.icon).toBeNull()
		}
	})

	it("shows no icon until a custom one is added", () => {
		const result = validate(custom({ customPath: null, icon: "check" }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.config.iconPath).toBeNull()
			expect(result.config.icon).toBeNull()
		}
	})

	it("keeps the custom path aside while the library is chosen", () => {
		const result = validate(custom({ iconSource: "library", icon: "check" }))
		expect(result.ok && result.config.icon).toBe("check")
		expect(result.ok && result.config.iconPath).toBeNull()
	})

	it("passes the line width of an outline icon", () => {
		const result = validate(custom({ customStroke: 1.5 }))
		expect(result.ok && result.config.iconStroke).toBe(1.5)
	})

	it("drops the line width when there is no custom path", () => {
		const result = validate(custom({ customPath: null, customStroke: 2 }))
		expect(result.ok && result.config.iconStroke).toBeNull()
	})

	it("reports a path the service would not accept", () => {
		const result = validate(custom({ customPath: "<script>" }))
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.errors.icon).toBeDefined()
	})
})

describe("cleanOrigin", () => {
	it("drops trailing slashes", () => {
		expect(cleanOrigin("https://a.example/")).toBe("https://a.example")
		expect(cleanOrigin(" https://a.example/x// ")).toBe("https://a.example/x")
	})

	it("accepts only http and https", () => {
		expect(cleanOrigin("http://localhost:3000")).toBe("http://localhost:3000")
		expect(cleanOrigin("javascript:alert(1)")).toBeNull()
		expect(cleanOrigin("ftp://a.example")).toBeNull()
		expect(cleanOrigin("")).toBeNull()
	})
})

describe("validate with own colors", () => {
	it("leaves both sides to the service by default", () => {
		const result = validate(base)
		expect(result.ok && result.config.labelColor).toBeNull()
		expect(result.ok && result.config.color).toEqual({
			type: "token",
			name: "success"
		})
	})

	it("takes the label color and derives the value color from it", () => {
		const result = validate(
			withState({ labelColor: choice("custom", { hex: "3B73D1" }) })
		)
		expect(result.ok && result.config.labelColor).toEqual({
			type: "hex",
			value: "3b73d1"
		})
		expect(result.ok && result.config.color).toEqual({
			type: "hex",
			value: "2c569d"
		})
	})

	it("lets both sides be chosen", () => {
		const result = validate(
			withState({
				labelColor: choice("token", { token: "info" }),
				valueColor: choice("custom", { hex: "ff00aa" })
			})
		)
		expect(result.ok && result.config.labelColor).toEqual({
			type: "token",
			name: "info"
		})
		expect(result.ok && result.config.color).toEqual({
			type: "hex",
			value: "ff00aa"
		})
	})

	it("reports a bad hex on either side", () => {
		const result = validate(
			withState({
				labelColor: choice("custom", { hex: "zz" }),
				valueColor: choice("custom", { hex: "12" })
			})
		)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors.labelColor).toBeDefined()
			expect(result.errors.color).toBeDefined()
		}
	})

	it("passes the text and icon colors", () => {
		const result = validate(
			withState({ textColor: "ffffff", iconColor: "ffaa00" })
		)
		expect(result.ok && result.config.textColor).toBe("ffffff")
		expect(result.ok && result.config.iconColor).toBe("ffaa00")
	})
})
