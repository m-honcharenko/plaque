import { useEffect, useState } from "preact/hooks"

import { renderSnippet } from "../../../src/core/badge/snippet.js"
import type { Validation } from "../builder-state.js"
import { button, card } from "../ui.js"

type SnippetOutputProps = {
	result: Validation
}

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}

type CopyState = "idle" | "copied" | "failed"

export function SnippetOutput({ result }: SnippetOutputProps) {
	const [copy, setCopy] = useState<CopyState>("idle")
	useEffect(() => {
		if (copy === "idle") return
		const timer = setTimeout(() => setCopy("idle"), 2000)
		return () => clearTimeout(timer)
	}, [copy])

	const snippet = result.ok
		? renderSnippet(result.config, {
				origin: result.origin,
				breakpoint: result.breakpoint,
				narrow: result.narrow
			})
		: null

	return (
		<section
			aria-labelledby="snippet-title"
			class={card}
		>
			<div class="flex items-center justify-between gap-3">
				<h2
					id="snippet-title"
					class="text-lg font-semibold"
				>
					Code for your .md file
				</h2>
				<button
					type="button"
					disabled={snippet === null}
					onClick={async () => {
						if (snippet === null) return
						setCopy((await copyText(snippet)) ? "copied" : "failed")
					}}
					class={`${button} border-neutral-300 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800`}
				>
					{copy === "copied"
						? "Copied"
						: copy === "failed"
							? "Select and copy"
							: "Copy"}
				</button>
			</div>
			{snippet === null ? (
				<p class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
					The code appears when the form has no errors.
				</p>
			) : (
				<pre
					tabIndex={0}
					class="mt-4 overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs leading-relaxed select-all sm:text-sm dark:bg-neutral-900"
				>
					{snippet}
				</pre>
			)}
			<p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
				Paste it into README.md. On screens narrower than the breakpoint GitHub
				shows the narrow badge.
			</p>
		</section>
	)
}
