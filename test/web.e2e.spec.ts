import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"
import { setupWeb } from "../src/web.js"

describe("web app (e2e)", () => {
	let app: NestFastifyApplication
	let dir: string

	beforeEach(async () => {
		dir = mkdtempSync(join(tmpdir(), "plaque-web-"))
		writeFileSync(
			join(dir, "index.html"),
			"<!doctype html><title>Plaque</title>"
		)
		writeFileSync(join(dir, "index-abc123.js"), "console.log(1)")
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()
		app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter()
		)
		await setupWeb(app, dir)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterEach(async () => {
		await app.close()
		rmSync(dir, { recursive: true, force: true })
	})

	it("serves the page at / without caching it", async () => {
		const res = await app.inject({ method: "GET", url: "/" })
		expect(res.statusCode).toBe(200)
		expect(res.headers["content-type"]).toContain("text/html")
		expect(res.headers["cache-control"]).toBe("no-cache")
		expect(res.body).toContain("Plaque")
	})

	it("serves hashed assets as immutable", async () => {
		const res = await app.inject({ method: "GET", url: "/index-abc123.js" })
		expect(res.statusCode).toBe(200)
		expect(res.headers["cache-control"]).toContain("immutable")
	})

	it("leaves the API routes alone", async () => {
		const health = await app.inject({ method: "GET", url: "/health" })
		expect(health.json()).toEqual({ status: "ok" })
		const badge = await app.inject({
			method: "GET",
			url: "/badge?label=a&value=b"
		})
		expect(badge.headers["content-type"]).toContain("image/svg+xml")
	})

	it("answers 404 for unknown paths", async () => {
		const res = await app.inject({ method: "GET", url: "/nope" })
		expect(res.statusCode).toBe(404)
	})
})

describe("setupWeb without a build", () => {
	it("returns false and registers nothing", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()
		const app = moduleRef.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter()
		)
		expect(await setupWeb(app, join(tmpdir(), "plaque-no-such-dir"))).toBe(
			false
		)
		await app.close()
	})
})
