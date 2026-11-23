import { PALETTE } from "../../../src/core/badge/badge-config.js"
import {
	COLOR_TOKENS,
	HEX_COLOR,
	type ColorToken
} from "../../../src/core/badge/badge-options.js"
import type { ColorChoice } from "../builder-state.js"
import { errorText, input, inputError } from "../ui.js"

type ColorPickerProps = {
	legend: string
	// What "Auto" does for this side, shown under the swatches.
	autoHint: string
	value: ColorChoice
	error?: string
	onChange: (value: ColorChoice) => void
}

const swatch =
	"flex h-10 items-center gap-2 rounded-lg border px-3 text-sm capitalize " +
	"focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"

function swatchState(active: boolean): string {
	return active
		? "border-neutral-900 ring-1 ring-neutral-900 dark:border-neutral-100 dark:ring-neutral-100"
		: "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
}

// Auto, five tokens and a custom hex color.
export function ColorPicker({
	legend,
	autoHint,
	value,
	error,
	onChange
}: ColorPickerProps) {
	const custom = value.mode === "custom"
	const auto = value.mode === "auto"
	return (
		<fieldset>
			<legend class="block text-sm font-medium">{legend}</legend>
			<div class="mt-1 flex flex-wrap gap-2">
				<button
					type="button"
					aria-pressed={auto}
					onClick={() => onChange({ ...value, mode: "auto" })}
					class={`${swatch} ${swatchState(auto)}`}
				>
					Auto
				</button>
				{COLOR_TOKENS.map((token: ColorToken) => (
					<button
						key={token}
						type="button"
						aria-pressed={value.mode === "token" && value.token === token}
						onClick={() => onChange({ ...value, mode: "token", token })}
						class={`${swatch} ${swatchState(value.mode === "token" && value.token === token)}`}
					>
						<span
							class="size-4 rounded-full"
							style={{ backgroundColor: `#${PALETTE[token]}` }}
						/>
						{token}
					</button>
				))}
				<button
					type="button"
					aria-pressed={custom}
					onClick={() => onChange({ ...value, mode: "custom" })}
					class={`${swatch} ${swatchState(custom)}`}
				>
					<span
						class="size-4 rounded-full border border-neutral-300"
						style={{
							backgroundColor: HEX_COLOR.test(value.hex)
								? `#${value.hex}`
								: "#ffffff"
						}}
					/>
					Custom
				</button>
			</div>
			{auto ? (
				<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
					{autoHint}
				</p>
			) : null}
			{custom ? (
				<div class="mt-3 flex items-center gap-2">
					<input
						type="color"
						aria-label={`${legend}: pick a color`}
						value={HEX_COLOR.test(value.hex) ? `#${value.hex}` : "#000000"}
						onInput={(event) =>
							onChange({
								...value,
								hex: event.currentTarget.value.slice(1).toLowerCase()
							})
						}
						class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-neutral-300 bg-transparent p-1 dark:border-neutral-700"
					/>
					<div class="flex min-w-0 flex-1 items-center gap-1">
						<span class="text-neutral-500">#</span>
						<input
							type="text"
							aria-label={`${legend}: hex`}
							aria-invalid={error !== undefined}
							value={value.hex}
							maxLength={6}
							spellcheck={false}
							autocomplete="off"
							onInput={(event) =>
								onChange({
									...value,
									hex: event.currentTarget.value.replace(/^#/, "").toLowerCase()
								})
							}
							class={`${input} font-mono ${error === undefined ? "" : inputError}`}
						/>
					</div>
				</div>
			) : null}
			{error === undefined ? null : (
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
