import type { INestApplication } from "@nestjs/common"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"

export function setupSwagger(app: INestApplication): void {
	const config = new DocumentBuilder()
		.setTitle("Plaque")
		.setDescription("Adaptive SVG badges for README files.")
		.setVersion("0.1.0")
		.build()
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup("docs", app, document, { jsonDocumentUrl: "docs-json" })
}
