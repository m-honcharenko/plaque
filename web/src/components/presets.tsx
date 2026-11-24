import { useState } from "preact/hooks"

import { BUILT_IN, NAME_MAX, type Preset } from "../presets.js"
import { button, errorText, hint, input, inputError } from "../ui.js"

type PresetsProps = {
	saved: readonly Preset[]
	onApply: (preset: Preset) => void
	// Returns the problem to show, or null when it was saved.
	onSave: (name: string) => string | null
	onRemove: (name: string) => void
}

const chip =
	"rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 " +
	"focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 " +
	"dark:border-neutral-700 dark:hover:bg-neutral-800"

// Built-in templates, the person's own, and a way to save the current look.
export function Presets({ saved, onApply, onSave, onRemove }: PresetsProps) {
	const [name, setName] = useState("")
	const [error, setError] = useState<string | null>(null)

	function save() {
		const problem = onSave(name)
		setError(problem)
		if (problem === null) setName("")
	}

	return (
		<fieldset>
			<legend class="block text-sm font-medium">Presets</legend>
			<div class="mt-1 flex flex-wrap gap-2">
				{BUILT_IN.map((preset) => (
					<button
						key={preset.name}
						type="button"
						onClick={() => onApply(preset)}
						class={chip}
					>
						{preset.name}
					</button>
				))}
			</div>

			{saved.length === 0 ? null : (
				<div class="mt-3">
					<p class={hint}>Yours, saved in this browser</p>
					<ul class="mt-1 flex flex-wrap gap-2">
						{saved.map((preset) => (
							<li
								key={preset.name}
								class="inline-flex overflow-hidden rounded-full border border-neutral-300 dark:border-neutral-700"
							>
								<button
									type="button"
									onClick={() => onApply(preset)}
									class="px-3 py-1.5 text-sm hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 dark:hover:bg-neutral-800"
								>
									{preset.name}
								</button>
								<button
									type="button"
									aria-label={`Remove preset ${preset.name}`}
									title="Remove"
									onClick={() => onRemove(preset.name)}
									class="border-l border-neutral-300 px-2 text-sm text-neutral-500 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 dark:border-neutral-700 dark:hover:bg-neutral-800"
								>
									<span aria-hidden="true">×</span>
								</button>
							</li>
						))}
					</ul>
				</div>
			)}

			<div class="mt-3 flex gap-2">
				<input
					type="text"
					value={name}
					maxLength={NAME_MAX}
					placeholder="Name this look"
					aria-label="Preset name"
					aria-invalid={error !== null}
					autocomplete="off"
					onInput={(event) => {
						setName(event.currentTarget.value)
						setError(null)
					}}
					onKeyDown={(event) => {
						if (event.key !== "Enter") return
						event.preventDefault()
						save()
					}}
					class={`${input} ${error === null ? "" : inputError}`}
				/>
				<button
					type="button"
					onClick={save}
					class={`${button} shrink-0 border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`}
				>
					Save current
				</button>
			</div>
			{error === null ? (
				<p class={hint}>
					A preset keeps the look, not the repository or package.
				</p>
			) : (
				<p
					class={errorText}
					role="alert"
				>
					{error}
				</p>
			)}
		</fieldset>
	)
}
