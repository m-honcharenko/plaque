import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"

describe("App (e2e)", () => {
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

	it("GET /health", async () => {
		const res = await app.inject({ method: "GET", url: "/health" })
		expect(res.statusCode).toBe(200)
		expect(res.json()).toEqual({ status: "ok" })
	})

	it("GET /badge returns svg", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/badge?label=build&value=passing&color=2da44e"
		})
		expect(res.statusCode).toBe(200)
		expect(res.headers["content-type"]).toContain("image/svg+xml")
		expect(res.body.startsWith("<svg")).toBe(true)
		expect(res.body).toContain("build: passing")
	})
})

describe("GET /badge validation", () => {
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

	const get = (query: string) =>
		app.inject({ method: "GET", url: `/badge?${query}` })

	it("accepts all params", async () => {
		const res = await get(
			"label=build&value=passing&color=success&icon=check&theme=dark&layout=compact"
		)
		expect(res.statusCode).toBe(200)
	})

	it("accepts empty label and ignores unknown params", async () => {
		const res = await get("label=&value=ok&foo=bar")
		expect(res.statusCode).toBe(200)
	})

	it("accepts hex color without #", async () => {
		const res = await get("value=ok&color=2DA44E")
		expect(res.statusCode).toBe(200)
	})

	it.each([
		["missing value", "label=a"],
		["empty value", "value="],
		["too long label", `label=${"a".repeat(25)}&value=ok`],
		["too long value", `value=${"a".repeat(25)}`],
		["unknown color", "value=ok&color=banana"],
		["hex with #", "value=ok&color=%232da44e"],
		["short hex", "value=ok&color=2da"],
		["bad icon name", "value=ok&icon=Check!"],
		["unknown theme", "value=ok&theme=sepia"],
		["unknown layout", "value=ok&layout=huge"],
		["repeated label", "label=a&label=b&value=ok"]
	])("rejects %s with 400", async (_name, query) => {
		const res = await get(query)
		expect(res.statusCode).toBe(400)
	})
})
