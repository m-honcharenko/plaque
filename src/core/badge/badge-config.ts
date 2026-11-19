export type BadgeConfig = { label: string; value: string; color: string }

export const DEFAULT_COLOR = "#2da44e"

export function normalizeConfig(input: Partial<BadgeConfig>): BadgeConfig {
	return {
		label: (input.label ?? "").trim(),
		value: (input.value ?? "").trim(),
		color: input.color ?? DEFAULT_COLOR
	}
}

export function configKey(config: BadgeConfig): string {
	return JSON.stringify([config.label, config.value, config.color])
}
