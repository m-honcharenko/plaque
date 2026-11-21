import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import type { NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"
import { createAdapter, setupHttp } from "../src/http.js"
import {
	MAX_BODY_BYTES,
	MAX_QUERY_PARAMS,
	MAX_URL_LENGTH
} from "../src/request-limits.js"

describe("request limits", () => {
	let app: NestFastifyApplication

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()
		app =
			moduleRef.createNestApplication<NestFastifyApplication>(createAdapter())
		await setupHttp(app)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterEach(async () => {
		await app.close()
	})

	const get = (url: string) => app.inject({ method: "GET", url })

	const urlOfLength = (length: number) => {
		const base = "/badge?value=ok&pad="
		return base + "x".repeat(length - base.length)
	}
	const params = (count: number) =>
		Array.from({ length: count }, (_, i) => `p${i}=1`).join("&")

	it("serves a url of exactly the maximum length", async () => {
		const url = urlOfLength(MAX_URL_LENGTH)
		expect(url.length).toBe(MAX_URL_LENGTH)
		expect((await get(url)).statusCode).toBe(200)
	})

	it("answers 414 with a badge for a longer /badge url", async () => {
		const res = await get(urlOfLength(MAX_URL_LENGTH + 1))
		expect(res.statusCode).toBe(414)
		expect(res.headers["content-type"]).toContain("image/svg+xml")
		expect(res.body).toContain("error: invalid params")
	})

	it("answers 414 with JSON for a longer url elsewhere", async () => {
		const res = await get(`/snippet?value=ok&pad=${"x".repeat(MAX_URL_LENGTH)}`)
		expect(res.statusCode).toBe(414)
		expect(res.json()).toMatchObject({ statusCode: 414 })
	})

	it("serves the maximum number of params", async () => {
		const res = await get(`/badge?value=ok&${params(MAX_QUERY_PARAMS - 1)}`)
		expect(res.statusCode).toBe(200)
	})

	it("answers 400 with a badge for too many params", async () => {
		const res = await get(`/badge?value=ok&${params(MAX_QUERY_PARAMS)}`)
		expect(res.statusCode).toBe(400)
		expect(res.headers["content-type"]).toContain("image/svg+xml")
		expect(res.body).toContain("error: invalid params")
	})

	it("answers 400 with JSON for too many params elsewhere", async () => {
		const res = await get(`/snippet?value=ok&${params(MAX_QUERY_PARAMS)}`)
		expect(res.statusCode).toBe(400)
		expect(res.json()).toMatchObject({ statusCode: 400 })
	})

	it("refuses 1000 short params without parsing them", async () => {
		const res = await get(`/badge?value=ok&${"a&".repeat(1000)}`)
		expect(res.statusCode).toBe(400)
	})

	it("refuses a body over the limit", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/badge",
			headers: { "content-type": "text/plain" },
			payload: "x".repeat(MAX_BODY_BYTES + 1)
		})
		expect(res.statusCode).toBe(413)
	})
})
