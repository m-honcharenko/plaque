import { useState } from "preact/hooks"

import {
	DEMO_BREAKPOINT,
	DEMO_REPO,
	DEMO_WIDTH,
	isNarrow,
	type DemoBadge
} from "../demo.js"
import { autoSurface, card } from "../ui.js"

type AdaptiveDemoProps = {
	badges: readonly DemoBadge[]
}

// A "screen" whose width the reader sets: past the breakpoint the badges
// switch to their narrow look, as they do in a README on a phone. The same
// rule as the media query in the snippet, with real badges from the service.
export function AdaptiveDemo({ badges }: AdaptiveDemoProps) {
	const [width, setWidth] = useState<number>(DEMO_WIDTH.start)
	const narrow = isNarrow(width)

	return (
		<div class={`${card} space-y-4`}>
			<div>
				<label
					for="demo-width"
					class="flex items-baseline justify-between gap-2 text-sm font-medium"
				>
					<span>Screen width</span>
					<output
						for="demo-width"
						class="font-mono text-xs text-neutral-500 dark:text-neutral-400"
					>
						{width} px, {narrow ? "narrow" : "wide"} badges
					</output>
				</label>
				<input
					id="demo-width"
					type="range"
					min={DEMO_WIDTH.min}
					max={DEMO_WIDTH.max}
					step={DEMO_WIDTH.step}
					value={width}
					aria-valuetext={`${width} pixels, ${narrow ? "narrow" : "wide"} badges`}
					onInput={(event) => setWidth(Number(event.currentTarget.value))}
					class="mt-2 w-full accent-blue-600"
				/>
				<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
					At {DEMO_BREAKPOINT} px and below GitHub shows the narrow badge.
				</p>
			</div>

			<div class="overflow-x-auto rounded-lg bg-neutral-100 p-3 sm:p-6 dark:bg-neutral-900/60">
				<div
					class={`mx-auto overflow-hidden rounded-xl border border-neutral-300 shadow-sm dark:border-neutral-700 ${autoSurface}`}
					style={{ width: `${width}px`, maxWidth: "100%" }}
				>
					<div class="border-b border-neutral-500/20 px-4 py-2 font-mono text-xs text-neutral-500">
						README.md
					</div>
					<div class="space-y-4 p-4 sm:p-5">
						<p class="text-lg font-bold">{DEMO_REPO.repo}</p>
						<div class="flex flex-wrap items-center gap-2">
							{badges.map((badge) => (
								<img
									key={badge.id}
									src={narrow ? badge.narrow : badge.wide}
									alt={`${badge.alt}${narrow ? ", narrow" : ""}`}
									class="max-w-none"
								/>
							))}
						</div>
						<div
							class="space-y-2"
							aria-hidden="true"
						>
							<div class="h-2 w-11/12 rounded bg-neutral-500/20" />
							<div class="h-2 w-4/5 rounded bg-neutral-500/20" />
							<div class="h-2 w-2/3 rounded bg-neutral-500/20" />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
