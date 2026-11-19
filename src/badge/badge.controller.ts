import { Controller, Get, Header, Query } from "@nestjs/common"

import { BadgeService } from "./badge.service.js"

@Controller("badge")
export class BadgeController {
	constructor(private readonly badges: BadgeService) {}

	@Get()
	@Header("Content-Type", "image/svg+xml; charset=utf-8")
	@Header("Cache-Control", "public, max-age=300")
	get(
		@Query("label") label?: string,
		@Query("value") value?: string,
		@Query("color") color?: string
	): string {
		return this.badges.render({ label, value, color })
	}
}
