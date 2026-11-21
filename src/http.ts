import compress from "@fastify/compress"
import type { NestFastifyApplication } from "@nestjs/platform-fastify"

// A badge is about 1 KB even without an icon (the style block alone is
// 600 bytes), so the plugin's default threshold of 1024 would skip half of
// them. Every response here is worth compressing.
const COMPRESS_THRESHOLD = 256

// HTTP behavior shared by main.ts and the e2e tests.
export async function setupHttp(app: NestFastifyApplication): Promise<void> {
	await app.register(compress, {
		global: true,
		encodings: ["gzip"],
		threshold: COMPRESS_THRESHOLD
	})
}
