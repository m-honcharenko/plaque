import { ICON_NAMES, getIcon } from "../../../src/core/icons/icons.js"

type IconPickerProps = {
	value: string | null
	onChange: (icon: string | null) => void
}

function IconGlyph({ name }: { name: string }) {
	const icon = getIcon(name)
	if (icon === undefined) return null
	return (
		<svg
			viewBox={`0 0 ${icon.size} ${icon.size}`}
			class="size-5"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d={icon.d} />
		</svg>
	)
}

const cell =
	"flex h-10 items-center justify-center rounded-lg border text-sm " +
	"focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"

function cellState(active: boolean): string {
	return active
		? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
		: "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
}

// Every whitelisted icon as a button, plus "none".
export function IconPicker({ value, onChange }: IconPickerProps) {
	return (
		<fieldset>
			<div class="flex items-baseline justify-between gap-2">
				<legend class="block text-sm font-medium">Icon</legend>
				<span class="font-mono text-xs text-neutral-500 dark:text-neutral-400">
					{value ?? "none"}
				</span>
			</div>
			<div class="mt-1 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
				<button
					type="button"
					aria-pressed={value === null}
					onClick={() => onChange(null)}
					class={`${cell} ${cellState(value === null)}`}
				>
					None
				</button>
				{ICON_NAMES.map((name) => (
					<button
						key={name}
						type="button"
						title={name}
						aria-label={name}
						aria-pressed={value === name}
						onClick={() => onChange(name)}
						class={`${cell} ${cellState(value === name)}`}
					>
						<IconGlyph name={name} />
					</button>
				))}
			</div>
		</fieldset>
	)
}
