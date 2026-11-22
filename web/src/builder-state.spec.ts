import { describe, expect, it } from "bun:test"

import {
	cleanOrigin,
	defaultState,
	validate,
	type BuilderState
} from "./builder-state.js"

const base = defaultState("https://plaque.example")

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
		const result = validate(withState({ colorMode: "token", token: "error" }))
		expect(result.ok && result.config.color).toEqual({
			type: "token",
			name: "error"
		})
	})

	it("uses a lowercase hex color in custom mode", () => {
		const result = validate(withState({ colorMode: "custom", hex: "1A7F37" }))
		expect(result.ok && result.config.color).toEqual({
			type: "hex",
			value: "1a7f37"
		})
	})

	it("rejects a bad hex only in custom mode", () => {
		expect(validate(withState({ colorMode: "custom", hex: "12" })).ok).toBe(
			false
		)
		expect(validate(withState({ colorMode: "token", hex: "12" })).ok).toBe(true)
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
