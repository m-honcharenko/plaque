import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"

describe("rate limit on /badge", () => {
	let app: NestFastifyApplication

	async function start(env: Record<string, string>) {
		Object.assign(process.env, env)
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()
		app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter()
		)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	}

	beforeEach(async () => {
		await start({ RATE_LIMIT_MAX: "3", RATE_LIMIT_WINDOW_MS: "60000" })
	})

	afterEach(async () => {
		await app.close()
		delete process.env.RATE_LIMIT_MAX
		delete process.env.RATE_LIMIT_WINDOW_MS
	})

	const badge = (remoteAddress = "10.0.0.1", query = "value=ok") =>
		app.inject({ method: "GET", url: `/badge?${query}`, remoteAddress })

	it("lets requests through up to the limit", async () => {
		for (let i = 0; i < 3; i++) {
			expect((await badge()).statusCode).toBe(200)
		}
	})

	it("answers 429 with a badge, Retry-After and no-store after that", async () => {
		for (let i = 0; i < 3; i++) await badge()
		const res = await badge()
		expect(res.statusCode).toBe(429)
		expect(res.headers["content-type"]).toContain("image/svg+xml")
		expect(res.headers["cache-control"]).toBe("no-store")
		expect(Number(res.headers["retry-after"])).toBeGreaterThan(0)
		expect(res.body).toContain("error: rate limited")
	})

	it("counts each client separately", async () => {
		for (let i = 0; i < 4; i++) await badge("10.0.0.1")
		expect((await badge("10.0.0.1")).statusCode).toBe(429)
		expect((await badge("10.0.0.2")).statusCode).toBe(200)
	})

	it("counts invalid requests too", async () => {
		for (let i = 0; i < 3; i++) {
			expect((await badge("10.0.0.3", "label=a")).statusCode).toBe(400)
		}
		expect((await badge("10.0.0.3")).statusCode).toBe(429)
	})

	it("does not limit /snippet or /health", async () => {
		for (let i = 0; i < 6; i++) {
			const snippet = await app.inject({
				method: "GET",
				url: "/snippet?value=ok",
				remoteAddress: "10.0.0.4"
			})
			expect(snippet.statusCode).toBe(200)
			const health = await app.inject({
				method: "GET",
				url: "/health",
				remoteAddress: "10.0.0.4"
			})
			expect(health.statusCode).toBe(200)
		}
	})

	it("lets the client back in when the window is over", async () => {
		await app.close()
		await start({ RATE_LIMIT_MAX: "1", RATE_LIMIT_WINDOW_MS: "300" })
		expect((await badge()).statusCode).toBe(200)
		expect((await badge()).statusCode).toBe(429)
		await Bun.sleep(400)
		expect((await badge()).statusCode).toBe(200)
	})
})

describe("rate limit config", () => {
	afterEach(() => {
		delete process.env.RATE_LIMIT_MAX
	})

	it("stops the start on an invalid value", async () => {
		process.env.RATE_LIMIT_MAX = "lots"
		let error: unknown
		try {
			await Test.createTestingModule({ imports: [AppModule] }).compile()
		} catch (caught) {
			error = caught
		}
		expect(error).toBeInstanceOf(RangeError)
	})
})
