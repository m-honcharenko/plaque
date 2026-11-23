import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"

describe("label, text and icon colors (e2e)", () => {
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

	it("renders the label color and a derived value color", async () => {
		const res = await get("/badge?label=ci&value=ok&label-color=3b73d1")
		expect(res.statusCode).toBe(200)
		expect(res.body).toContain("--l:#3b73d1")
		expect(res.body).toContain("--v:#2c569d")
	})

	it("renders text and icon colors", async () => {
		const res = await get(
			"/badge?label=ci&value=ok&icon=check&text-color=ff0000&icon-color=00ff00"
		)
		expect(res.statusCode).toBe(200)
		expect(res.body).toContain('fill="#ff0000"')
		expect(res.body).toContain('fill="#00ff00"')
	})

	it.each([
		["label-color=nope"],
		["label-color=%23fff"],
		["text-color=success"],
		["text-color=12345"],
		["icon-color=%23ffffff"]
	])("answers 400 for %s", async (query) => {
		const res = await get(`/badge?value=ok&${query}`)
		expect(res.statusCode).toBe(400)
	})

	it("carries the colors into the snippet URLs", async () => {
		const res = await get(
			"/snippet?value=ok&label-color=3b73d1&text-color=ffffff&icon-color=ffaa00"
		)
		expect(res.statusCode).toBe(200)
		expect(res.body).toContain("label-color=3b73d1")
		expect(res.body).toContain("text-color=ffffff")
		expect(res.body).toContain("icon-color=ffaa00")
	})
})
