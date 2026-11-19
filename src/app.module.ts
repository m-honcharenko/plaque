import { Module, ValidationPipe } from "@nestjs/common"
import { APP_PIPE } from "@nestjs/core"

import { BadgeModule } from "./badge/badge.module.js"
import { HealthModule } from "./health/health.module.js"

@Module({
	imports: [BadgeModule, HealthModule],
	providers: [
		{
			provide: APP_PIPE,
			useValue: new ValidationPipe({ whitelist: true, transform: true })
		}
	]
})
export class AppModule {}
