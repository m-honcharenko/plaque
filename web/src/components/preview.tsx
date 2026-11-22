import type { Theme } from "../../../src/core/badge/badge-options.js"
import { badgeUrl } from "../../../src/core/badge/snippet.js"
import type { Validation } from "../builder-state.js"
import { card } from "../ui.js"

type PreviewProps = {
	result: Validation
	// Where the preview images come from: the service serving this page.
	origin: string
	theme: Theme
}

// A forced theme gets the background it is meant for. "auto" follows the
// system, like the badge itself, so it uses the media query and not the
// page theme (the "dark:" variant).
const BACKGROUND: Record<Theme, string> = {
	auto: "bg-neutral-50 text-neutral-900 [@media(prefers-color-scheme:dark)]:bg-neutral-900 [@media(prefers-color-scheme:dark)]:text-neutral-100",
	light: "bg-white text-neutral-900",
	dark: "bg-[#0d1117] text-neutral-100"
}

function Row({
	title,
	note,
	children
}: {
	title: string
	note: string
	children: preact.ComponentChildren
}) {
	return (
		<div>
			<div class="flex flex-wrap items-baseline justify-between gap-x-3">
				<h3 class="text-sm font-medium">{title}</h3>
				<span class="text-xs text-neutral-500 dark:text-neutral-400">
					{note}
				</span>
			</div>
			<div class="mt-2 flex min-h-16 items-center overflow-x-auto rounded-lg border border-neutral-500/30 p-4">
				{children}
			</div>
		</div>
	)
}

export function Preview({ result, origin, theme }: PreviewProps) {
	return (
		<section
			aria-labelledby="preview-title"
			class={card}
		>
			<h2
				id="preview-title"
				class="text-lg font-semibold"
			>
				Preview
			</h2>
			{result.ok ? (
				<div class={`mt-4 space-y-4 rounded-lg p-3 ${BACKGROUND[theme]}`}>
					<Row
						title="Wide screen"
						note={`over ${result.breakpoint} px, full`}
					>
						<img
							src={badgeUrl(origin, result.config, "full")}
							alt={`${result.config.label} ${result.config.value}`}
							class="max-w-none"
						/>
					</Row>
					<Row
						title="Narrow screen"
						note={`up to ${result.breakpoint} px, ${result.narrow}`}
					>
						<img
							src={badgeUrl(origin, result.config, result.narrow)}
							alt={`${result.config.label} ${result.config.value}, narrow`}
							class="max-w-none"
						/>
					</Row>
				</div>
			) : (
				<p class="mt-4 rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
					Fix the highlighted fields to see the preview.
				</p>
			)}
		</section>
	)
}
