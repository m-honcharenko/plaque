import { UI_THEMES, type UiTheme } from "../theme.js"

type ThemeSwitchProps = {
	value: UiTheme
	onChange: (theme: UiTheme) => void
}

const LABELS: Record<UiTheme, string> = {
	system: "System theme",
	light: "Light theme",
	dark: "Dark theme"
}

const ICONS: Record<UiTheme, preact.ComponentChildren> = {
	system: (
		<>
			<rect
				x="2"
				y="3"
				width="20"
				height="14"
				rx="2"
			/>
			<path d="M8 21h8M12 17v4" />
		</>
	),
	light: (
		<>
			<circle
				cx="12"
				cy="12"
				r="4"
			/>
			<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
		</>
	),
	dark: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
}

// System, light, dark: three icon buttons, one pressed.
export function ThemeSwitch({ value, onChange }: ThemeSwitchProps) {
	return (
		<div
			role="group"
			aria-label="Color theme"
			class="inline-flex shrink-0 overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700"
		>
			{UI_THEMES.map((theme) => (
				<button
					key={theme}
					type="button"
					title={LABELS[theme]}
					aria-label={LABELS[theme]}
					aria-pressed={theme === value}
					onClick={() => onChange(theme)}
					class={
						"flex size-10 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 " +
						(theme === value
							? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
							: "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800")
					}
				>
					<svg
						viewBox="0 0 24 24"
						class="size-5"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						{ICONS[theme]}
					</svg>
				</button>
			))}
		</div>
	)
}
