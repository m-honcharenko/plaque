import { NestFactory } from "@nestjs/core"
import {
	FastifyAdapter,
	type NestFastifyApplication
} from "@nestjs/platform-fastify"

import { AppModule } from "./app.module.js"
import { setupHttp } from "./http.js"
import { setupSwagger } from "./swagger.js"

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		// Behind a proxy the client address comes from X-Forwarded-For.
		new FastifyAdapter({ trustProxy: process.env.TRUST_PROXY === "true" })
	)
	await setupHttp(app)
	setupSwagger(app)
	await app.listen(process.env.PORT ?? 3000, "0.0.0.0")
}
await bootstrap()
