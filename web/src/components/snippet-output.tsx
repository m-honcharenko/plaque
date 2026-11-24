import type { Result } from "../build.js"
import { card } from "../ui.js"
import { CopyButton } from "./copy-button.js"

type SnippetOutputProps = {
	result: Result
}

export function SnippetOutput({ result }: SnippetOutputProps) {
	const snippet = result.ok ? result.snippet : null

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
				<CopyButton text={snippet} />
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
				{result.ok && result.live
					? " The badge follows the live value; GitHub and npm answers are cached for a few minutes."
					: ""}
			</p>
		</section>
	)
}
