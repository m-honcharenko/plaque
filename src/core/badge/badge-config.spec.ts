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
			iconPath: null,
			theme: "auto",
			layout: "full"
		})
	})

	it("trims label and value", () => {
		const config = normalizeConfig({ label: "  build ", value: " passing  " })
		expect(config.label).toBe("build")
		expect(config.value).toBe("passing")
	})

	it("collapses inner whitespace, tabs and newlines", () => {
		const config = normalizeConfig({ label: "a \t b", value: "x\n\ny" })
		expect(config.label).toBe("a b")
		expect(config.value).toBe("x y")
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

describe("custom icon path", () => {
	it("keeps a valid path in canonical form", () => {
		const config = normalizeConfig({
			value: "ok",
			iconPath: "M12,2 L2 22h20  z"
		})
		expect(config.iconPath).toBe("M12 2L2 22h20z")
		expect(config.icon).toBeNull()
	})

	it("treats an empty path as none", () => {
		expect(normalizeConfig({ value: "ok", iconPath: "  " }).iconPath).toBeNull()
	})

	it("rejects a path that is not drawing data", () => {
		expect(() =>
			normalizeConfig({ value: "ok", iconPath: "<script>" })
		).toThrow(RangeError)
	})

	it("rejects a path together with a named icon", () => {
		expect(() =>
			normalizeConfig({ value: "ok", icon: "check", iconPath: "M0 0z" })
		).toThrow(RangeError)
	})

	it("gives different paths different cache keys", () => {
		const a = normalizeConfig({ value: "ok", iconPath: "M0 0L1 1z" })
		const b = normalizeConfig({ value: "ok", iconPath: "M0 0L2 2z" })
		expect(configKey(a)).not.toBe(configKey(b))
	})
})
