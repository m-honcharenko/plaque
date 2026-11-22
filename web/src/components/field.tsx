import type { ComponentChildren } from "preact"

import { errorText, hint, labelText } from "../ui.js"

type FieldProps = {
	id: string
	label: string
	hint?: string
	error?: string
	// Shown on the right of the label, for example a character counter.
	aside?: string
	children: ComponentChildren
}

// A label, the control, and a hint or an error under it.
export function Field({
	id,
	label,
	hint: help,
	error,
	aside,
	children
}: FieldProps) {
	return (
		<div>
			<div class="flex items-baseline justify-between gap-2">
				<label
					for={id}
					class={labelText}
				>
					{label}
				</label>
				{aside === undefined ? null : (
					<span class="text-xs text-neutral-500 dark:text-neutral-400">
						{aside}
					</span>
				)}
			</div>
			<div class="mt-1">{children}</div>
			{error === undefined ? null : (
				<p
					class={errorText}
					role="alert"
				>
					{error}
				</p>
			)}
			{help === undefined || error !== undefined ? null : (
				<p class={hint}>{help}</p>
			)}
		</div>
	)
}
