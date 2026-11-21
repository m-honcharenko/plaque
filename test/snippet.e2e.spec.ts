import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"

describe("GET /snippet", () => {
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

	const get = (query: string, host = "plaque.test") =>
		app.inject({
			method: "GET",
			url: `/snippet?${query}`,
			headers: { host }
		})

	it("returns a picture with a narrow source and an img fallback", async () => {
		const res = await get("label=build&value=passing")
		expect(res.statusCode).toBe(200)
		expect(res.headers["content-type"]).toContain("text/plain")
		expect(res.body).toContain("<picture>")
		expect(res.body).toContain('media="(max-width: 600px)"')
		expect(res.body).toContain("layout=compact")
		expect(res.body).toContain("layout=full")
		expect(res.body).toContain('alt="build: passing"')
	})

	it("points the urls at the host of the request", async () => {
		const res = await get("value=ok", "badges.example.com")
		expect(res.body).toContain('src="http://badges.example.com/badge?')
	})

	it("takes the breakpoint from the query", async () => {
		const res = await get("value=ok&breakpoint=480")
		expect(res.body).toContain("(max-width: 480px)")
	})

	it("ignores a layout param", async () => {
		const res = await get("value=ok&layout=vertical")
		expect(res.statusCode).toBe(200)
		expect(res.body).toContain("layout=compact")
	})

	it.each([
		"label=release&value=v2.4.1&icon=tag",
		"label=my+label&value=a%26b%23c&color=2DA44E&theme=dark"
	])("serves urls that /badge renders: %s", async (query) => {
		const snippet = await get(query)
		const urls = [
			...snippet.body.matchAll(/(?:srcset|src)="http:\/\/plaque\.test([^"]+)"/g)
		].map((match) => (match[1] ?? "").replaceAll("&amp;", "&"))
		expect(urls).toHaveLength(2)
		for (const url of urls) {
			const res = await app.inject({ method: "GET", url })
			expect(res.statusCode).toBe(200)
			expect(res.headers["content-type"]).toContain("image/svg+xml")
		}
	})

	it("serves a status in compact and data in vertical", async () => {
		const status = await get("value=passing")
		const data = await get("value=v2.4.1")
		expect(status.body).toContain("layout=compact")
		expect(data.body).toContain("layout=vertical")
	})

	it.each([
		["missing value", "label=a"],
		["blank value", "value=%20"],
		["unknown color", "value=ok&color=banana"],
		["unknown icon", "value=ok&icon=nope"],
		["breakpoint not a number", "value=ok&breakpoint=wide"],
		["breakpoint not an integer", "value=ok&breakpoint=600.5"],
		["breakpoint too small", "value=ok&breakpoint=100"],
		["breakpoint too big", "value=ok&breakpoint=5000"],
		["empty breakpoint", "value=ok&breakpoint="]
	])("rejects %s with 400", async (_name, query) => {
		const res = await get(query)
		expect(res.statusCode).toBe(400)
		expect(res.body).not.toContain("<picture>")
	})

	it.each([
		'"><script>alert(1)</script>',
		"</picture><img src=x onerror=alert(1)>"
	])("escapes hostile input: %s", async (payload) => {
		const encoded = encodeURIComponent(payload.slice(0, 24))
		const res = await get(`label=${encoded}&value=${encoded}`)
		expect(res.statusCode).toBe(200)
		expect(res.body).not.toContain("<script")
		expect(res.body.match(/</g)?.length).toBe(4)
	})

	it("escapes a hostile Host header", async () => {
		const res = await get("value=ok", 'evil"><script>x</script>')
		expect(res.body).not.toContain("<script")
		expect(res.body.match(/</g)?.length).toBe(4)
	})
})
