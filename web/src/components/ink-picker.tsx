type InkPickerProps = {
	legend: string
	// Six hex digits without "#", or null for a color picked automatically.
	value: string | null
	onChange: (value: string | null) => void
}

const choice =
	"h-10 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 "

function choiceState(active: boolean): string {
	return active
		? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
		: "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
}

// Auto, or one color picked with the system picker.
export function InkPicker({ legend, value, onChange }: InkPickerProps) {
	return (
		<fieldset>
			<legend class="block text-sm font-medium">{legend}</legend>
			<div class="mt-1 flex items-center gap-2">
				<div class="inline-flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
					<button
						type="button"
						aria-pressed={value === null}
						onClick={() => onChange(null)}
						class={choice + choiceState(value === null)}
					>
						Auto
					</button>
					<button
						type="button"
						aria-pressed={value !== null}
						onClick={() => onChange(value ?? "ffffff")}
						class={choice + choiceState(value !== null)}
					>
						Custom
					</button>
				</div>
				{value === null ? null : (
					<>
						<input
							type="color"
							aria-label={`${legend}: pick a color`}
							value={`#${value}`}
							onInput={(event) =>
								onChange(event.currentTarget.value.slice(1).toLowerCase())
							}
							class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-neutral-300 bg-transparent p-1 dark:border-neutral-700"
						/>
						<span class="font-mono text-xs text-neutral-500 dark:text-neutral-400">
							#{value}
						</span>
					</>
				)}
			</div>
		</fieldset>
	)
}
