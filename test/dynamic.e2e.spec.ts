import { afterEach, beforeEach, describe, expect, it } from "bun:test"

import type { NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"

import { AppModule } from "../src/app.module.js"
import {
	VALUE_PROVIDER,
	ValueError,
	type ProvidedValue,
	type ValueProvider,
	type ValueQuery
} from "../src/core/ports/value-provider.port.js"
import { createAdapter, setupHttp } from "../src/http.js"
import { MAX_URL_LENGTH } from "../src/request-limits.js"

// A provider the test controls; it never touches the network.
class FakeProvider implements ValueProvider {
	asked: ValueQuery[] = []
	answer: ProvidedValue | ValueError = {
		label: "stars",
		value: "12k",
		color: "info",
		icon: "star"
	}

	async fetch(query: ValueQuery): Promise<ProvidedValue> {
		this.asked.push(query)
		if (this.answer instanceof Error) throw this.answer
		return this.answer
	}
}

describe("live badges", () => {
	let app: NestFastifyApplication
	let provider: FakeProvider

	async function start() {
		provider = new FakeProvider()
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		})
			.overrideProvider(VALUE_PROVIDER)
			.useValue(provider)
			.compile()
		app =
			moduleRef.createNestApplication<NestFastifyApplication>(createAdapter())
		await setupHttp(app)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	}

	beforeEach(start)

	afterEach(async () => {
		await app.close()
	})

	const get = (url: string, headers: Record<string, string> = {}) =>
		app.inject({ method: "GET", url, headers })

	describe("GET /gh/:owner/:repo/:metric", () => {
		it("renders the value of the repository", async () => {
			const res = await get("/gh/octocat/Hello-World/stars")
			expect(res.statusCode).toBe(200)
			expect(res.headers["content-type"]).toContain("image/svg+xml")
			expect(res.headers["cache-control"]).toBe("public, max-age=300")
			expect(res.body).toContain("stars: 12k")
			expect(provider.asked).toEqual([
				{
					source: "github",
					metric: "stars",
					owner: "octocat",
					repo: "Hello-World"
				}
			])
		})

		it.each(["stars", "ci", "release", "license"])(
			"asks for the metric %s",
			async (metric) => {
				await get(`/gh/o/r/${metric}`)
				expect(provider.asked[0]).toMatchObject({ metric })
			}
		)

		it("has an ETag and answers 304 to a matching If-None-Match", async () => {
			const first = await get("/gh/o/r/stars")
			const etag = String(first.headers.etag)
			expect(etag).toMatch(/^"/)
			const second = await get("/gh/o/r/stars", { "if-none-match": etag })
			expect(second.statusCode).toBe(304)
			expect(second.body).toBe("")
		})

		it("lets the options of the caller override the defaults", async () => {
			const res = await get(
				"/gh/o/r/stars?label=Our%20stars&color=ff0000&theme=dark&layout=compact"
			)
			expect(res.statusCode).toBe(200)
			expect(res.body).toContain("#ff0000")
			expect(res.body).toContain("Our stars")
			expect(res.body).not.toContain(">stars<")
		})

		it("drops the icon of the provider for an icon-path of the caller", async () => {
			const withPath = await get(
				"/gh/o/r/stars?icon-path=M12%202L2%2022h20z&icon-stroke=2"
			)
			expect(withPath.statusCode).toBe(200)
			expect(withPath.body).toContain("M12 2L2 22h20z")
		})

		it("ignores a value param: the value comes from the provider", async () => {
			const res = await get("/gh/o/r/stars?value=hacked")
			expect(res.statusCode).toBe(200)
			expect(res.body).toContain("12k")
			expect(res.body).not.toContain("hacked")
		})

		it("answers 400 with a badge for an icon together with an icon-path", async () => {
			const res = await get("/gh/o/r/stars?icon=heart&icon-path=M0%200h24")
			expect(res.statusCode).toBe(400)
			expect(res.body).toContain("error: invalid params")
			expect(provider.asked).toHaveLength(0)
		})

		it.each([
			["an unknown metric", "/gh/o/r/forks"],
			["a metric in another case", "/gh/o/r/Stars"],
			["an owner starting with a hyphen", "/gh/-o/r/stars"],
			["a repo with an encoded slash", "/gh/o/a%2Fb/stars"],
			["an owner that is too long", `/gh/${"a".repeat(40)}/r/stars`],
			["a bad color", "/gh/o/r/stars?color=nope"]
		])(
			"answers 400 with a badge for %s, without asking upstream",
			async (_n, url) => {
				const res = await get(url)
				expect(res.statusCode).toBe(400)
				expect(res.headers["content-type"]).toContain("image/svg+xml")
				expect(res.body).toContain("error: invalid params")
				expect(provider.asked).toHaveLength(0)
			}
		)
	})

	it("never reaches the provider with dot segments in the path", async () => {
		for (const url of [
			"/gh/o/../stars",
			"/gh/o/%2e%2e/stars",
			"/npm/../version",
			"/npm/%2e%2e/version"
		]) {
			const res = await get(url)
			expect([400, 404]).toContain(res.statusCode)
		}
		expect(provider.asked).toHaveLength(0)
	})

	describe("GET /npm/...", () => {
		beforeEach(() => {
			provider.answer = {
				label: "npm",
				value: "v19.1.0",
				color: "info",
				icon: "npm"
			}
		})

		it("renders the version of a package", async () => {
			const res = await get("/npm/react/version")
			expect(res.statusCode).toBe(200)
			expect(res.body).toContain("npm: v19.1.0")
			expect(provider.asked).toEqual([
				{ source: "npm", metric: "version", name: "react" }
			])
		})

		it.each(["/npm/@types/node/version", "/npm/@types%2Fnode/version"])(
			"takes a scoped name from %s",
			async (url) => {
				const res = await get(url)
				expect(res.statusCode).toBe(200)
				expect(provider.asked).toEqual([
					{ source: "npm", metric: "version", name: "@types/node" }
				])
			}
		)

		it.each([
			["a scope without @", "/npm/types/node/version"],
			["a name with a space", "/npm/a%20b/version"],
			["a name that is too long", `/npm/${"a".repeat(215)}/version`]
		])("answers 400 with a badge for %s", async (_n, url) => {
			const res = await get(url)
			expect(res.statusCode).toBe(400)
			expect(res.body).toContain("error: invalid params")
			expect(provider.asked).toHaveLength(0)
		})
	})

	describe("when the value cannot be had", () => {
		it("shows a not found badge with status 200", async () => {
			provider.answer = new ValueError("not_found")
			const res = await get("/gh/o/missing/stars")
			expect(res.statusCode).toBe(200)
			expect(res.headers["content-type"]).toContain("image/svg+xml")
			expect(res.body).toContain("stars: not found")
			expect(res.headers["cache-control"]).toBe("public, max-age=300")
		})

		it("shows an unavailable badge with status 200 and a short cache time", async () => {
			provider.answer = new ValueError("unavailable")
			const res = await get("/gh/o/r/ci")
			expect(res.statusCode).toBe(200)
			expect(res.body).toContain("build: unavailable")
			expect(res.headers["cache-control"]).toBe("public, max-age=60")
		})

		it("says npm for a missing package", async () => {
			provider.answer = new ValueError("not_found")
			const res = await get("/npm/nope/version")
			expect(res.body).toContain("npm: not found")
		})
	})

	describe("request limits", () => {
		it("answers 414 with a badge for a url that is too long", async () => {
			const base = "/gh/o/r/stars?pad="
			const res = await get(base + "x".repeat(MAX_URL_LENGTH + 1 - base.length))
			expect(res.statusCode).toBe(414)
			expect(res.headers["content-type"]).toContain("image/svg+xml")
			expect(res.body).toContain("error: invalid params")
			expect(provider.asked).toHaveLength(0)
		})
	})

	describe("GET /snippet/gh/... and /snippet/npm/...", () => {
		const snippet = (path: string, host = "plaque.test") =>
			get(`/snippet${path}`, { host })

		it("points the picture at the live route", async () => {
			const res = await snippet("/gh/octocat/Hello-World/stars")
			expect(res.statusCode).toBe(200)
			expect(res.headers["content-type"]).toContain("text/plain")
			expect(res.body).toContain("<picture>")
			expect(res.body).toContain(
				'srcset="http://plaque.test/gh/octocat/Hello-World/stars?layout=vertical"'
			)
			expect(res.body).toContain(
				'src="http://plaque.test/gh/octocat/Hello-World/stars?layout=full"'
			)
			expect(res.body).toContain('media="(max-width: 600px)"')
			expect(res.body).toContain('alt="stars"')
			expect(provider.asked).toHaveLength(0)
		})

		it("uses the compact layout for CI", async () => {
			const res = await snippet("/gh/o/r/ci")
			expect(res.body).toContain("/gh/o/r/ci?layout=compact")
		})

		it("carries the options and the breakpoint", async () => {
			const res = await snippet(
				"/gh/o/r/stars?label=Our%20stars&color=ff0000&breakpoint=480"
			)
			expect(res.body).toContain("(max-width: 480px)")
			expect(res.body).toContain("label=Our+stars&amp;color=ff0000&amp;layout=")
			expect(res.body).toContain('alt="Our stars"')
		})

		it("makes the npm snippet, escaping a scope", async () => {
			const plain = await snippet("/npm/react/version")
			expect(plain.body).toContain("http://plaque.test/npm/react/version?")
			const scoped = await snippet("/npm/@types/node/version")
			expect(scoped.body).toContain(
				"http://plaque.test/npm/@types%2Fnode/version?layout=full"
			)
		})

		it("follows PUBLIC_URL", async () => {
			process.env.PUBLIC_URL = "https://badges.example.com/"
			try {
				const res = await snippet("/npm/react/version")
				expect(res.body).toContain(
					"https://badges.example.com/npm/react/version"
				)
			} finally {
				delete process.env.PUBLIC_URL
			}
		})

		it.each([
			["/gh/o/r/forks"],
			["/gh/-o/r/stars"],
			["/npm/types/node/version"],
			["/gh/o/r/stars?color=nope"]
		])("answers 400 for %s", async (path) => {
			expect((await snippet(path)).statusCode).toBe(400)
		})
	})
})

describe("live badges: rate limit", () => {
	let app: NestFastifyApplication
	let provider: FakeProvider

	beforeEach(async () => {
		process.env.RATE_LIMIT_MAX = "2"
		process.env.RATE_LIMIT_WINDOW_MS = "60000"
		provider = new FakeProvider()
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule]
		})
			.overrideProvider(VALUE_PROVIDER)
			.useValue(provider)
			.compile()
		app =
			moduleRef.createNestApplication<NestFastifyApplication>(createAdapter())
		await setupHttp(app)
		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterEach(async () => {
		await app.close()
		delete process.env.RATE_LIMIT_MAX
		delete process.env.RATE_LIMIT_WINDOW_MS
	})

	const hit = (remoteAddress: string) =>
		app.inject({
			method: "GET",
			url: "/gh/o/r/stars",
			remoteAddress
		})

	it("answers 429 with a badge before asking upstream", async () => {
		await hit("10.0.0.1")
		await hit("10.0.0.1")
		const res = await hit("10.0.0.1")
		expect(res.statusCode).toBe(429)
		expect(res.body).toContain("error: rate limited")
		expect(res.headers["cache-control"]).toBe("no-store")
		expect(provider.asked).toHaveLength(2)
	})

	it("counts every client on its own", async () => {
		await hit("10.0.0.1")
		await hit("10.0.0.1")
		expect((await hit("10.0.0.2")).statusCode).toBe(200)
	})
})
