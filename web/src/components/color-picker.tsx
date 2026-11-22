import { PALETTE } from "../../../src/core/badge/badge-config.js"
import {
	COLOR_TOKENS,
	HEX_COLOR,
	type ColorToken
} from "../../../src/core/badge/badge-options.js"
import type { BuilderState } from "../builder-state.js"
import { errorText, input, inputError } from "../ui.js"

type ColorPickerProps = {
	state: BuilderState
	error?: string
	onChange: (patch: Partial<BuilderState>) => void
}

const swatch =
	"flex h-10 items-center gap-2 rounded-lg border px-3 text-sm capitalize " +
	"focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"

function swatchState(active: boolean): string {
	return active
		? "border-neutral-900 ring-1 ring-neutral-900 dark:border-neutral-100 dark:ring-neutral-100"
		: "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
}

// Five tokens plus a custom hex color.
export function ColorPicker({ state, error, onChange }: ColorPickerProps) {
	const custom = state.colorMode === "custom"
	return (
		<fieldset>
			<legend class="block text-sm font-medium">Color</legend>
			<div class="mt-1 flex flex-wrap gap-2">
				{COLOR_TOKENS.map((token: ColorToken) => (
					<button
						key={token}
						type="button"
						aria-pressed={!custom && state.token === token}
						onClick={() => onChange({ colorMode: "token", token })}
						class={`${swatch} ${swatchState(!custom && state.token === token)}`}
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
					onClick={() => onChange({ colorMode: "custom" })}
					class={`${swatch} ${swatchState(custom)}`}
				>
					<span
						class="size-4 rounded-full border border-neutral-300"
						style={{
							backgroundColor: HEX_COLOR.test(state.hex)
								? `#${state.hex}`
								: "#ffffff"
						}}
					/>
					Custom
				</button>
			</div>
			{custom ? (
				<div class="mt-3 flex items-center gap-2">
					<input
						type="color"
						aria-label="Pick a color"
						value={HEX_COLOR.test(state.hex) ? `#${state.hex}` : "#000000"}
						onInput={(event) =>
							onChange({
								hex: event.currentTarget.value.slice(1).toLowerCase()
							})
						}
						class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-neutral-300 bg-transparent p-1 dark:border-neutral-700"
					/>
					<div class="flex min-w-0 flex-1 items-center gap-1">
						<span class="text-neutral-500">#</span>
						<input
							type="text"
							aria-label="Hex color"
							aria-invalid={error !== undefined}
							value={state.hex}
							maxLength={6}
							spellcheck={false}
							autocomplete="off"
							onInput={(event) =>
								onChange({
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
