import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"
import { setupSwagger } from "../src/swagger.js"

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

	it("accepts brand and ui icons from the whitelist", async () => {
		for (const icon of ["check", "github", "git-branch"]) {
			const res = await get(`value=ok&icon=${icon}`)
			expect(res.statusCode).toBe(200)
		}
	})

	it("accepts hex color without #", async () => {
		const res = await get("value=ok&color=2DA44E")
		expect(res.statusCode).toBe(200)
	})

	it.each([
		["missing value", "label=a"],
		["empty value", "value="],
		["blank value", "value=%20%20"],
		["too long label", `label=${"a".repeat(25)}&value=ok`],
		["too long value", `value=${"a".repeat(25)}`],
		["unknown color", "value=ok&color=banana"],
		["hex with #", "value=ok&color=%232da44e"],
		["short hex", "value=ok&color=2da"],
		["bad icon name", "value=ok&icon=Check!"],
		["unknown icon name", "value=ok&icon=nope"],
		["uppercase icon name", "value=ok&icon=Check"],
		["prototype icon name", "value=ok&icon=__proto__"],
		["empty icon name", "value=ok&icon="],
		["unknown theme", "value=ok&theme=sepia"],
		["unknown layout", "value=ok&layout=huge"],
		["repeated label", "label=a&label=b&value=ok"]
	])("rejects %s with 400 and an error badge", async (_name, query) => {
		const res = await get(query)
		expect(res.statusCode).toBe(400)
		expect(res.headers["content-type"]).toContain("image/svg+xml")
		expect(res.body.startsWith("<svg")).toBe(true)
		expect(res.body).toContain("error: invalid params")
	})
})

describe("GET /badge injection", () => {
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

	it.each([
		[
			"closing svg and script",
			"value=%3C%2Fsvg%3E%3Cscript%3Ex%3C%2Fscript%3E"
		],
		["attribute breakout", "value=%22%20onload%3D%22x"],
		["label payload", "label=%3Cimg%20src%3Dx%3E&value=ok"],
		["control character", "value=a%01b"]
	])("returns safe svg for %s", async (_name, query) => {
		const res = await app.inject({ method: "GET", url: `/badge?${query}` })
		expect(res.statusCode).toBe(200)
		expect(res.body).not.toContain("<script")
		expect(res.body).not.toContain("<img")
		expect(res.body).not.toContain('onload="x')
		expect(res.body).not.toContain("\u0001")
	})
})

describe("Swagger", () => {
	let app: NestFastifyApplication

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()
		app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter()
		)
		setupSwagger(app)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterEach(async () => {
		await app.close()
	})

	it("documents GET /badge with its params and responses", async () => {
		const res = await app.inject({ method: "GET", url: "/docs-json" })
		expect(res.statusCode).toBe(200)
		const op = res.json().paths["/badge"].get
		const names = op.parameters.map((p: { name: string }) => p.name)
		expect(names).toEqual(
			expect.arrayContaining([
				"label",
				"value",
				"color",
				"icon",
				"theme",
				"layout"
			])
		)
		const value = op.parameters.find(
			(p: { name: string }) => p.name === "value"
		)
		expect(value.required).toBe(true)
		expect(op.responses["200"].content["image/svg+xml"]).toBeDefined()
		expect(op.responses["400"].content["image/svg+xml"]).toBeDefined()
	})

	it("serves the UI at /docs", async () => {
		const res = await app.inject({ method: "GET", url: "/docs" })
		expect(res.statusCode).toBe(200)
		expect(res.headers["content-type"]).toContain("text/html")
	})
})
