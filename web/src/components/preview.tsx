import type { Theme } from "../../../src/core/badge/badge-options.js"
import type { Result } from "../build.js"
import { autoSurface, card } from "../ui.js"

type PreviewProps = {
	// The images come from the service serving this page.
	result: Result
	theme: Theme
}

// A forced theme gets the background it is meant for.
const BACKGROUND: Record<Theme, string> = {
	auto: autoSurface,
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

export function Preview({ result, theme }: PreviewProps) {
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
							src={result.wideUrl}
							alt={result.alt}
							class="max-w-none"
						/>
					</Row>
					<Row
						title="Narrow screen"
						note={`up to ${result.breakpoint} px, ${result.narrow}`}
					>
						<img
							src={result.narrowUrl}
							alt={`${result.alt}, narrow`}
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
