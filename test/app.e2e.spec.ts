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
			url: "/badge?label=build&value=passing&color=%232da44e"
		})
		expect(res.statusCode).toBe(200)
		expect(res.headers["content-type"]).toContain("image/svg+xml")
		expect(res.body.startsWith("<svg")).toBe(true)
		expect(res.body).toContain("build: passing")
	})
})
