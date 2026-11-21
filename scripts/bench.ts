import { mkdir } from "node:fs/promises"
import { cpus } from "node:os"

import autocannon from "autocannon"

import { BadgeService } from "../src/badge/badge.service.js"
import type { BadgeCache } from "../src/core/ports/badge-cache.port.js"
import { LruBadgeCache } from "../src/infra/lru-badge-cache.js"
import { NullBadgeCache } from "../src/infra/null-badge-cache.js"

const PORT = 3399
const BASE = `http://127.0.0.1:${PORT}`
const DURATION = Number(process.env.BENCH_DURATION ?? 10)
const CONNECTIONS = Number(process.env.BENCH_CONNECTIONS ?? 64)
const CACHE_SIZE = 1000
const SAME = "/badge?label=build&value=passing&icon=workflow"

type Options = Partial<autocannon.Options>

type Scenario = {
	name: string
	status: number
	// Builds the request once the server is up.
	prepare: () => Promise<Options>
}

const SCENARIOS: Scenario[] = [
	{
		name: "same badge",
		status: 200,
		prepare: async () => ({ requests: [{ path: SAME }] })
	},
	{
		name: "a different badge every time",
		status: 200,
		prepare: async () => {
			let counter = 0
			return {
				requests: [
					{
						setupRequest: (request) => ({
							...request,
							path: `/badge?label=build&value=v${counter++}`
						})
					}
				]
			}
		}
	},
	{
		name: "same badge, client already has it (304)",
		status: 304,
		prepare: async () => {
			const first = await fetch(BASE + SAME)
			const etag = first.headers.get("etag")
			if (etag === null) throw new Error("no ETag in the response")
			return {
				requests: [{ path: SAME, headers: { "if-none-match": etag } }]
			}
		}
	}
]

async function startServer(cacheSize: number) {
	const proc = Bun.spawn(["bun", "dist/main.js"], {
		env: {
			...process.env,
			PORT: String(PORT),
			BADGE_CACHE_SIZE: String(cacheSize),
			// The benchmark comes from one address; do not rate limit it.
			RATE_LIMIT_MAX: "1000000000",
			NODE_ENV: "production"
		},
		stdout: "ignore",
		stderr: "ignore"
	})
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			if ((await fetch(`${BASE}/health`)).ok) return proc
		} catch {
			// not up yet
		}
		await Bun.sleep(100)
	}
	proc.kill()
	throw new Error("the server did not start")
}

type Row = {
	scenario: string
	cache: "off" | "on"
	requestsPerSecond: number
	p50: number
	p99: number
}

async function measure(scenario: Scenario, cacheSize: number): Promise<Row> {
	const server = await startServer(cacheSize)
	try {
		const request = await scenario.prepare()
		// Warm up the JIT and the connections before counting.
		await autocannon({ url: BASE, connections: 16, duration: 2, ...request })
		const result = await autocannon({
			url: BASE,
			connections: CONNECTIONS,
			duration: DURATION,
			...request
		})
		const statuses = Object.keys(result.statusCodeStats ?? {})
		const onlyExpected =
			statuses.length === 1 && statuses[0] === String(scenario.status)
		if (!onlyExpected || result.errors > 0 || result.timeouts > 0) {
			throw new Error(
				`${scenario.name}: statuses ${statuses.join(",")}, ${result.errors} errors, ${result.timeouts} timeouts`
			)
		}
		return {
			scenario: scenario.name,
			cache: cacheSize === 0 ? "off" : "on",
			requestsPerSecond: Math.round(result.requests.average),
			p50: result.latency.p50,
			p99: result.latency.p99
		}
	} finally {
		server.kill()
		await server.exited
	}
}

// The service alone, with no HTTP around it: what one badge costs.
function inProcess(cache: BadgeCache, unique: boolean): number {
	const service = new BadgeService(cache)
	const input = (n: number) => ({
		label: "build",
		value: unique ? `v${n}` : "passing",
		icon: "workflow"
	})
	const iterations = 100_000
	for (let n = 0; n < 20_000; n++) service.render(input(n))
	const start = performance.now()
	for (let n = 0; n < iterations; n++) service.render(input(n + 20_000))
	return Math.round((iterations / (performance.now() - start)) * 1000)
}

const inProcessRows = [
	["no cache, every badge rendered", inProcess(new NullBadgeCache(), false)],
	[
		"cache, a different badge every time",
		inProcess(new LruBadgeCache(CACHE_SIZE), true)
	],
	["cache, same badge", inProcess(new LruBadgeCache(CACHE_SIZE), false)]
] as const
for (const [name, perSecond] of inProcessRows) {
	console.log(`in-process | ${name}: ${perSecond} badges/s`)
}

const rows: Row[] = []
for (const scenario of SCENARIOS) {
	for (const cacheSize of [0, CACHE_SIZE]) {
		const row = await measure(scenario, cacheSize)
		rows.push(row)
		console.log(
			`${row.scenario} | cache ${row.cache}: ${row.requestsPerSecond} req/s, p50 ${row.p50} ms, p99 ${row.p99} ms`
		)
	}
}

const cpu = cpus()[0]?.model ?? "unknown cpu"
const lines = [
	`${cpu}, ${cpus().length} threads, Bun ${Bun.version}, ${CONNECTIONS} connections, ${DURATION} s per run, client and server on one machine.`,
	"",
	"Service alone, no HTTP:",
	"",
	"| Case | Badges/s |",
	"| --- | ---: |",
	...inProcessRows.map(([name, perSecond]) => `| ${name} | ${perSecond} |`),
	"",
	"Over HTTP:",
	"",
	"| Scenario | Cache | Requests/s | p50, ms | p99, ms |",
	"| --- | --- | ---: | ---: | ---: |",
	...rows.map(
		(row) =>
			`| ${row.scenario} | ${row.cache} | ${row.requestsPerSecond} | ${row.p50} | ${row.p99} |`
	),
	""
]
await mkdir(".bench", { recursive: true })
await Bun.write(".bench/results.md", lines.join("\n"))
console.log(`\n${lines.join("\n")}`)
console.log("Saved to .bench/results.md")
