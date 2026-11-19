import { Module } from "@nestjs/common"

import { BadgeModule } from "./badge/badge.module.js"
import { HealthModule } from "./health/health.module.js"

@Module({ imports: [BadgeModule, HealthModule] })
export class AppModule {}
