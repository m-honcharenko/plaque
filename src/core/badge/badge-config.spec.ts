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
			labelColor: null,
			textColor: null,
			iconColor: null,
			icon: null,
			iconPath: null,
			iconStroke: null,
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

describe("custom icon stroke", () => {
	it("keeps a line width next to a path", () => {
		const config = normalizeConfig({
			value: "ok",
			iconPath: "M0 0L1 1",
			iconStroke: "1.5"
		})
		expect(config.iconStroke).toBe(1.5)
		expect(
			normalizeConfig({ value: "ok", iconPath: "M0 0L1 1" }).iconStroke
		).toBeNull()
	})

	it("accepts a number as well as text", () => {
		const config = normalizeConfig({
			value: "ok",
			iconPath: "M0 0L1 1",
			iconStroke: 2
		})
		expect(config.iconStroke).toBe(2)
	})

	it("rejects a width out of range, and a width without a path", () => {
		expect(() =>
			normalizeConfig({ value: "ok", iconPath: "M0 0L1 1", iconStroke: "9" })
		).toThrow(RangeError)
		expect(() => normalizeConfig({ value: "ok", iconStroke: "2" })).toThrow(
			RangeError
		)
	})

	it("tells a filled and an outlined icon apart in the cache key", () => {
		const filled = normalizeConfig({ value: "ok", iconPath: "M0 0L1 1" })
		const line = normalizeConfig({
			value: "ok",
			iconPath: "M0 0L1 1",
			iconStroke: "2"
		})
		expect(configKey(filled)).not.toBe(configKey(line))
	})
})

describe("label color and inks", () => {
	it("takes a token or a hex color for the label side", () => {
		expect(
			normalizeConfig({ value: "ok", labelColor: "info" }).labelColor
		).toEqual({ type: "token", name: "info" })
		expect(
			normalizeConfig({ value: "ok", labelColor: "3B73D1" }).labelColor
		).toEqual({ type: "hex", value: "3b73d1" })
	})

	it("derives a darker value color from the label color", () => {
		const config = normalizeConfig({ value: "ok", labelColor: "3b73d1" })
		expect(config.color).toEqual({ type: "hex", value: "2c569d" })
	})

	it("lightens the value side next to a nearly black label", () => {
		const config = normalizeConfig({ value: "ok", labelColor: "000000" })
		expect(config.color).toEqual({ type: "hex", value: "333333" })
	})

	it("keeps an explicit value color", () => {
		const config = normalizeConfig({
			value: "ok",
			labelColor: "3b73d1",
			color: "error"
		})
		expect(config.color).toEqual({ type: "token", name: "error" })
	})

	it("keeps the usual value color when there is no label color", () => {
		expect(normalizeConfig({ value: "ok" }).color).toEqual({
			type: "token",
			name: "success"
		})
	})

	it("takes hex ink colors in lowercase, and nothing else", () => {
		const config = normalizeConfig({
			value: "ok",
			textColor: "FFAA00",
			iconColor: ""
		})
		expect(config.textColor).toBe("ffaa00")
		expect(config.iconColor).toBeNull()
		for (const bad of ["success", "#fff", "12345", "zzzzzz"]) {
			expect(() => normalizeConfig({ value: "ok", textColor: bad })).toThrow(
				RangeError
			)
		}
		expect(() => normalizeConfig({ value: "ok", labelColor: "nope" })).toThrow(
			RangeError
		)
	})

	it("gives different colors different cache keys", () => {
		const keys = [
			{},
			{ labelColor: "3b73d1" },
			{ textColor: "ffffff" },
			{ iconColor: "ffffff" }
		].map((extra) => configKey(normalizeConfig({ value: "ok", ...extra })))
		expect(new Set(keys).size).toBe(4)
	})
})
