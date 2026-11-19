import { describe, expect, it } from "bun:test"

import {
	colorHex,
	configKey,
	normalizeColor,
	normalizeConfig
} from "./badge-config.js"

describe("normalizeConfig", () => {
	it("fills defaults", () => {
		expect(normalizeConfig({ value: "ok" })).toEqual({
			label: "",
			value: "ok",
			color: { type: "token", name: "success" },
			icon: null,
			theme: "auto",
			layout: "full"
		})
	})

	it("trims label and value", () => {
		const config = normalizeConfig({ label: "  build ", value: " passing  " })
		expect(config.label).toBe("build")
		expect(config.value).toBe("passing")
	})

	it("keeps explicit options", () => {
		const config = normalizeConfig({
			value: "ok",
			icon: "check",
			theme: "dark",
			layout: "compact"
		})
		expect(config).toMatchObject({
			icon: "check",
			theme: "dark",
			layout: "compact"
		})
	})

	it("treats empty icon as no icon", () => {
		expect(normalizeConfig({ value: "ok", icon: "" }).icon).toBeNull()
	})
})

describe("normalizeColor", () => {
	it("maps a token", () => {
		expect(normalizeColor("error")).toEqual({ type: "token", name: "error" })
	})

	it("lowercases hex", () => {
		expect(normalizeColor("2DA44E")).toEqual({ type: "hex", value: "2da44e" })
	})

	it("rejects unknown colors", () => {
		expect(() => normalizeColor("banana")).toThrow(RangeError)
		expect(() => normalizeColor("#2da44e")).toThrow(RangeError)
	})

	it("resolves tokens and hex to hex", () => {
		expect(colorHex(normalizeColor("info"))).toBe("0969da")
		expect(colorHex(normalizeColor("ABCDEF"))).toBe("abcdef")
	})
})

describe("configKey", () => {
	it("is equal for equivalent inputs", () => {
		const a = configKey(normalizeConfig({ value: "ok" }))
		const b = configKey(
			normalizeConfig({
				value: " ok ",
				color: "success",
				theme: "auto",
				layout: "full"
			})
		)
		expect(a).toBe(b)
		expect(configKey(normalizeConfig({ value: "ok", color: "ABCDEF" }))).toBe(
			configKey(normalizeConfig({ value: "ok", color: "abcdef" }))
		)
	})

	it("differs when any option differs", () => {
		const base = configKey(normalizeConfig({ value: "ok" }))
		for (const extra of [
			{ label: "a" },
			{ color: "error" },
			{ icon: "check" },
			{ theme: "dark" as const },
			{ layout: "compact" as const }
		]) {
			expect(configKey(normalizeConfig({ value: "ok", ...extra }))).not.toBe(
				base
			)
		}
	})
})
