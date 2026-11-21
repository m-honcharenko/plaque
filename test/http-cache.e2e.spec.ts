import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { gunzipSync } from "node:zlib"

import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"
import { setupHttp } from "../src/http.js"

describe("HTTP caching", () => {
	let app: NestFastifyApplication

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()
		app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter()
		)
		await setupHttp(app)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterEach(async () => {
		await app.close()
	})

	const URL_ = "/badge?label=build&value=passing&icon=workflow"
	const get = (headers: Record<string, string> = {}, url = URL_) =>
		app.inject({ method: "GET", url, headers })

	it("sends a strong ETag and Cache-Control", async () => {
		const res = await get()
		expect(res.statusCode).toBe(200)
		expect(res.headers.etag).toMatch(/^"[A-Za-z0-9_-]{27}"$/)
		expect(res.headers["cache-control"]).toBe("public, max-age=300")
		expect(res.headers["content-type"]).toContain("image/svg+xml")
	})

	it("gives the same ETag to the same badge and another to a different one", async () => {
		const a = await get()
		const b = await get()
		const c = await get({}, `${URL_}&theme=dark`)
		expect(b.headers.etag).toBe(a.headers.etag)
		expect(c.headers.etag).not.toBe(a.headers.etag)
	})

	it("answers 304 with no body when If-None-Match matches", async () => {
		const first = await get()
		const etag = String(first.headers.etag)
		const res = await get({ "if-none-match": etag })
		expect(res.statusCode).toBe(304)
		expect(res.body).toBe("")
		expect(res.headers.etag).toBe(etag)
		expect(res.headers["cache-control"]).toBe("public, max-age=300")
	})

	it("answers 304 for a weak copy of the ETag and for *", async () => {
		const etag = String((await get()).headers.etag)
		expect((await get({ "if-none-match": `W/${etag}` })).statusCode).toBe(304)
		expect((await get({ "if-none-match": "*" })).statusCode).toBe(304)
	})

	it("answers 200 with the badge when the ETag is stale", async () => {
		const res = await get({ "if-none-match": '"stale"' })
		expect(res.statusCode).toBe(200)
		expect(res.body.startsWith("<svg")).toBe(true)
	})

	it("revalidates a badge that came back gzipped", async () => {
		const first = await get({ "accept-encoding": "gzip" })
		const etag = String(first.headers.etag)
		const res = await get({
			"accept-encoding": "gzip",
			"if-none-match": etag
		})
		expect(res.statusCode).toBe(304)
	})

	it("gzips the badge when the client accepts it", async () => {
		const plain = await get()
		const zipped = await get({ "accept-encoding": "gzip" })
		expect(zipped.headers["content-encoding"]).toBe("gzip")
		expect(String(zipped.headers.vary).toLowerCase()).toContain(
			"accept-encoding"
		)
		expect(zipped.rawPayload.length).toBeLessThan(plain.rawPayload.length)
		expect(gunzipSync(zipped.rawPayload).toString()).toBe(plain.body)
	})

	it("gzips the smallest badge too", async () => {
		const res = await get({ "accept-encoding": "gzip" }, "/badge?value=ok")
		expect(res.headers["content-encoding"]).toBe("gzip")
	})

	it("does not gzip for a client that does not ask", async () => {
		const res = await get({ "accept-encoding": "identity" })
		expect(res.headers["content-encoding"]).toBeUndefined()
	})

	it("does not cache the error badge for long and has no ETag", async () => {
		const res = await get({}, "/badge?label=a")
		expect(res.statusCode).toBe(400)
		expect(res.headers["cache-control"]).toBe("public, max-age=60")
		expect(res.headers.etag).toBeUndefined()
	})

	it("gzips the snippet too", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/snippet?label=build&value=passing&icon=workflow",
			headers: { "accept-encoding": "gzip" }
		})
		expect(res.statusCode).toBe(200)
		expect(res.headers["content-encoding"]).toBe("gzip")
		expect(gunzipSync(res.rawPayload).toString()).toContain("<picture>")
	})
})
