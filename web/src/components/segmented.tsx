type SegmentedProps<T extends string> = {
	legend: string
	options: readonly T[]
	value: T
	onChange: (value: T) => void
	// Text for an option that should not be shown as the option's name
	// with a capital letter ("GitHub", "npm", "CI").
	labels?: Partial<Record<T, string>>
}

// A small group of mutually exclusive buttons.
export function Segmented<T extends string>({
	legend,
	options,
	value,
	onChange,
	labels
}: SegmentedProps<T>) {
	return (
		<fieldset>
			<legend class="block text-sm font-medium">{legend}</legend>
			<div class="mt-1 inline-flex flex-wrap overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
				{options.map((option) => {
					const text = labels?.[option]
					return (
						<button
							key={option}
							type="button"
							aria-pressed={option === value}
							onClick={() => onChange(option)}
							class={
								"px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 " +
								(text === undefined ? "capitalize " : "") +
								(option === value
									? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
									: "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800")
							}
						>
							{text ?? option}
						</button>
					)
				})}
			</div>
		</fieldset>
	)
}
