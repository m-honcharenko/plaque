import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"

const PATH = encodeURIComponent("M12 2L2 22h20z")

describe("custom icon-path (e2e)", () => {
	let app: NestFastifyApplication

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()
		app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter()
		)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterEach(async () => {
		await app.close()
	})

	const get = (url: string) => app.inject({ method: "GET", url })

	it("renders a badge with the path", async () => {
		const res = await get(`/badge?label=build&value=ok&icon-path=${PATH}`)
		expect(res.statusCode).toBe(200)
		expect(res.body).toContain('d="M12 2L2 22h20z"')
	})

	it.each([
		["not path data", encodeURIComponent("<script>alert(1)</script>")],
		["a bad command", encodeURIComponent("M0 0 X1 1")],
		["too long", encodeURIComponent("M0 0" + "L1 1".repeat(200))],
		["empty", ""]
	])("answers 400 for %s", async (_name, value) => {
		const res = await get(`/badge?value=ok&icon-path=${value}`)
		expect(res.statusCode).toBe(400)
		expect(res.body).toContain("invalid params")
	})

	it("answers 400 when both icon and icon-path are given", async () => {
		const res = await get(`/badge?value=ok&icon=check&icon-path=${PATH}`)
		expect(res.statusCode).toBe(400)
	})

	it("draws an outline when icon-stroke is given", async () => {
		const res = await get(`/badge?value=ok&icon-path=${PATH}&icon-stroke=1.5`)
		expect(res.statusCode).toBe(200)
		expect(res.body).toContain('stroke-width="1.5"')
	})

	it.each([
		["without a path", "icon-stroke=2"],
		["out of range", `icon-path=${PATH}&icon-stroke=9`],
		["not a number", `icon-path=${PATH}&icon-stroke=thick`]
	])("answers 400 for icon-stroke %s", async (_name, query) => {
		const res = await get(`/badge?value=ok&${query}`)
		expect(res.statusCode).toBe(400)
	})

	it("carries the line width into the snippet URLs", async () => {
		const res = await get(`/snippet?value=ok&icon-path=${PATH}&icon-stroke=2`)
		expect(res.statusCode).toBe(200)
		expect(res.body).toContain("icon-stroke=2")
	})

	it("carries the path into the snippet URLs", async () => {
		const res = await get(`/snippet?value=ok&icon-path=${PATH}`)
		expect(res.statusCode).toBe(200)
		expect(res.body).toContain("icon-path=")
		const src = res.body.match(/<img src="([^"]+)"/)?.[1]
		expect(src).toBeDefined()
		const url = new URL(String(src).replaceAll("&amp;", "&"))
		expect(url.searchParams.get("icon-path")).toBe("M12 2L2 22h20z")
	})

	it("keeps the snippet URL inside the request limit for the longest path", async () => {
		const longest = "M0 0" + "L1 1".repeat(124)
		const res = await get(
			`/snippet?value=ok&icon-path=${encodeURIComponent(longest)}`
		)
		expect(res.statusCode).toBe(200)
		const src = res.body.match(/<img src="([^"]+)"/)?.[1] ?? ""
		const probe = await get(
			new URL(src.replaceAll("&amp;", "&")).pathname +
				new URL(src.replaceAll("&amp;", "&")).search
		)
		expect(probe.statusCode).toBe(200)
	})
})
