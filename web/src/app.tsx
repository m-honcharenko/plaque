import { useState } from "preact/hooks"

import { LIMITS, THEMES } from "../../src/core/badge/badge-options.js"
import { BREAKPOINT_RANGE } from "../../src/core/badge/snippet.js"
import {
	ICON_SOURCES,
	NARROW_CHOICES,
	defaultState,
	validate,
	type BuilderState
} from "./builder-state.js"
import { ColorPicker } from "./components/color-picker.js"
import { CustomIcon } from "./components/custom-icon.js"
import { Field } from "./components/field.js"
import { IconPicker } from "./components/icon-picker.js"
import { InkPicker } from "./components/ink-picker.js"
import { Preview } from "./components/preview.js"
import { Segmented } from "./components/segmented.js"
import { SnippetOutput } from "./components/snippet-output.js"
import { ThemeSwitch } from "./components/theme-switch.js"
import { card, input, inputError } from "./ui.js"
import { useDebounced } from "./use-debounced.js"
import { useUiTheme } from "./use-ui-theme.js"

function inputClass(error: string | undefined): string {
	return `${input} ${error === undefined ? "" : inputError}`
}

export function App() {
	const pageOrigin = window.location.origin
	const [uiTheme, setUiTheme] = useUiTheme()
	const [state, setState] = useState<BuilderState>(() =>
		defaultState(pageOrigin)
	)
	const patch = (change: Partial<BuilderState>) =>
		setState((current) => ({ ...current, ...change }))

	// The code reacts at once; the preview waits for a pause in typing so it
	// does not request a new badge on every key.
	const live = validate(state)
	const settled = validate(useDebounced(state, 250))
	const errors = live.ok ? {} : live.errors

	return (
		<main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
			<header class="flex items-start justify-between gap-4">
				<div>
					<h1 class="text-3xl font-bold tracking-tight sm:text-5xl">Plaque</h1>
					<p class="mt-3 max-w-2xl text-base text-neutral-600 sm:text-lg dark:text-neutral-400">
						Build a badge for your README that adapts to the reader's screen.
					</p>
				</div>
				<ThemeSwitch
					value={uiTheme}
					onChange={setUiTheme}
				/>
			</header>

			<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr] lg:gap-8">
				<div class="lg:col-start-2 lg:row-start-1">
					<Preview
						result={live.ok ? settled : live}
						origin={pageOrigin}
						theme={state.theme}
					/>
				</div>

				<form
					class={`${card} space-y-6 lg:col-start-1 lg:row-span-3 lg:row-start-1`}
					onSubmit={(event) => event.preventDefault()}
					noValidate
				>
					<div class="grid gap-6 sm:grid-cols-2">
						<Field
							id="label"
							label="Label"
							aside={`${state.label.length}/${LIMITS.label}`}
							error={errors.label}
							hint="Left text. Leave empty for none."
						>
							<input
								id="label"
								type="text"
								value={state.label}
								placeholder="build"
								autocomplete="off"
								aria-invalid={errors.label !== undefined}
								onInput={(event) => patch({ label: event.currentTarget.value })}
								class={inputClass(errors.label)}
							/>
						</Field>
						<Field
							id="value"
							label="Value"
							aside={`${state.value.length}/${LIMITS.value}`}
							error={errors.value}
							hint="Right text: a status or a piece of data."
						>
							<input
								id="value"
								type="text"
								value={state.value}
								placeholder="passing"
								autocomplete="off"
								aria-invalid={errors.value !== undefined}
								onInput={(event) => patch({ value: event.currentTarget.value })}
								class={inputClass(errors.value)}
							/>
						</Field>
					</div>

					<ColorPicker
						legend="Left side color"
						autoHint="Auto: the surface of the page theme."
						value={state.labelColor}
						error={errors.labelColor}
						onChange={(labelColor) => patch({ labelColor })}
					/>

					<ColorPicker
						legend="Right side color"
						autoHint="Auto: green, or a darker shade of the left color."
						value={state.valueColor}
						error={errors.color}
						onChange={(valueColor) => patch({ valueColor })}
					/>

					<div class="grid gap-6 sm:grid-cols-2">
						<InkPicker
							legend="Text color"
							value={state.textColor}
							onChange={(textColor) => patch({ textColor })}
						/>
						<InkPicker
							legend="Icon color"
							value={state.iconColor}
							onChange={(iconColor) => patch({ iconColor })}
						/>
					</div>

					<div>
						<Segmented
							legend="Icon"
							options={ICON_SOURCES}
							value={state.iconSource}
							onChange={(iconSource) => patch({ iconSource })}
						/>
						<div class="mt-3">
							{state.iconSource === "library" ? (
								<IconPicker
									value={state.icon}
									onChange={(icon) => patch({ icon })}
								/>
							) : (
								<CustomIcon
									path={state.customPath}
									stroke={state.customStroke}
									onChange={(customPath, customStroke) =>
										patch({ customPath, customStroke })
									}
								/>
							)}
						</div>
						{errors.icon === undefined ? null : (
							<p
								class="mt-1 text-sm text-red-600 dark:text-red-400"
								role="alert"
							>
								{errors.icon}
							</p>
						)}
					</div>

					<Segmented
						legend="Theme"
						options={THEMES}
						value={state.theme}
						onChange={(theme) => patch({ theme })}
					/>

					<div>
						<Segmented
							legend="Narrow screen look"
							options={NARROW_CHOICES}
							value={state.narrow}
							onChange={(narrow) => patch({ narrow })}
						/>
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							Auto: a status like "passing" becomes an icon (compact), data like
							"v2.4.1" stacks under the icon (vertical).
						</p>
					</div>

					<details class="group rounded-lg border border-neutral-300 dark:border-neutral-700">
						<summary class="cursor-pointer rounded-lg px-4 py-3 text-sm font-medium select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50">
							Advanced
						</summary>
						<div class="space-y-6 border-t border-neutral-300 p-4 dark:border-neutral-700">
							<Field
								id="breakpoint"
								label="Narrow layout below"
								aside={`${state.breakpoint} px`}
								error={errors.breakpoint}
							>
								<input
									id="breakpoint"
									type="range"
									min={BREAKPOINT_RANGE.min}
									max={BREAKPOINT_RANGE.max}
									step={10}
									value={state.breakpoint}
									onInput={(event) =>
										patch({ breakpoint: Number(event.currentTarget.value) })
									}
									class="w-full accent-blue-600"
								/>
							</Field>

							<Field
								id="origin"
								label="Service URL"
								error={errors.origin}
								hint="Where the badges are loaded from."
							>
								<input
									id="origin"
									type="url"
									value={state.origin}
									autocomplete="off"
									spellcheck={false}
									aria-invalid={errors.origin !== undefined}
									onInput={(event) =>
										patch({ origin: event.currentTarget.value })
									}
									class={inputClass(errors.origin)}
								/>
							</Field>
						</div>
					</details>
				</form>

				<div class="lg:col-start-2 lg:row-start-2">
					<SnippetOutput result={live} />
				</div>
			</div>
		</main>
	)
}
