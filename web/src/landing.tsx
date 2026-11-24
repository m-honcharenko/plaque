import { renderDynamicSnippet } from "../../src/core/badge/dynamic-snippet.js"
import { DEFAULT_BREAKPOINT } from "../../src/core/badge/snippet.js"
import type { ValueQuery } from "../../src/core/ports/value-provider.port.js"
import { githubQuery } from "../../src/core/values/query.js"
import { AdaptiveDemo } from "./components/adaptive-demo.js"
import { CopyButton } from "./components/copy-button.js"
import { ThemeSwitch } from "./components/theme-switch.js"
import { DEMO_REPO, demoBadges } from "./demo.js"
import { button, card } from "./ui.js"
import { useUiTheme } from "./use-ui-theme.js"

export const GITHUB_URL = "https://github.com/m-honcharenko/plaque"

const primary = `${button} border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300`
const secondary = `${button} border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`
const navLink =
	"rounded px-1 py-0.5 text-sm hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"

const FEATURES = [
	{
		title: "Fits the screen",
		text: "One picture tag swaps the badge by screen width. A wide badge on a laptop becomes a compact or stacked one on a phone, with no script and no extra requests."
	},
	{
		title: "Live values",
		text: "Stars, CI status, the latest release, the license and the npm version, read from GitHub and npm and cached. When an upstream is down you get an “unavailable” badge, never a broken image."
	},
	{
		title: "Light and dark",
		text: "Badges follow the reader's color scheme and keep their text readable on both. Pick your own colors, icons and even your own icon path when you need to."
	},
	{
		title: "Nothing to sign up for",
		text: "No accounts, no database, no tracking. The badge is a URL, so you can read it, copy it and keep it. The service is open source under the MIT license."
	}
] as const

const STEPS = [
	"Open the builder and pick a preset, or type your repository.",
	"Copy the code it gives you.",
	"Paste it into your README.md."
] as const

// The snippet for the quick start: stars of "owner/repo", to be replaced.
function quickStart(origin: string): string {
	const query = githubQuery("owner", "repo", "stars") as ValueQuery
	return renderDynamicSnippet(
		query,
		{},
		{ origin, breakpoint: DEFAULT_BREAKPOINT }
	)
}

export function Landing() {
	const origin = window.location.origin
	const [uiTheme, setUiTheme] = useUiTheme()
	const snippet = quickStart(origin)

	return (
		<>
			<header class="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
				<a
					href="/"
					class="rounded text-lg font-bold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
				>
					Plaque
				</a>
				<nav
					aria-label="Main"
					class="flex items-center gap-3 sm:gap-4"
				>
					<a
						href="/builder"
						class={navLink}
					>
						Builder
					</a>
					<a
						href="/docs"
						class={navLink}
					>
						API
					</a>
					<a
						href={GITHUB_URL}
						class={navLink}
					>
						GitHub
					</a>
					<ThemeSwitch
						value={uiTheme}
						onChange={setUiTheme}
					/>
				</nav>
			</header>

			<main class="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
				<section class="py-10 sm:py-16">
					<h1 class="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
						Badges that fit the reader's screen
					</h1>
					<p class="mt-5 max-w-2xl text-base text-neutral-600 sm:text-lg dark:text-neutral-400">
						Plaque makes README badges that switch to a compact or stacked look
						on a phone, and can follow live values from GitHub and npm.
					</p>
					<div class="mt-8 flex flex-wrap gap-3">
						<a
							href="/builder"
							class={primary}
						>
							Open the builder
						</a>
						<a
							href={GITHUB_URL}
							class={secondary}
						>
							View on GitHub
						</a>
					</div>
				</section>

				<section
					aria-labelledby="demo-title"
					class="py-6"
				>
					<h2
						id="demo-title"
						class="text-2xl font-semibold tracking-tight"
					>
						See it adapt
					</h2>
					<p class="mt-2 mb-4 max-w-2xl text-neutral-600 dark:text-neutral-400">
						Drag the slider to change the screen width. The stars, release and
						license are live values of {DEMO_REPO.owner}/{DEMO_REPO.repo},
						served by this service.
					</p>
					<AdaptiveDemo badges={demoBadges(origin)} />
				</section>

				<section
					aria-labelledby="why-title"
					class="py-10"
				>
					<h2
						id="why-title"
						class="text-2xl font-semibold tracking-tight"
					>
						Why Plaque
					</h2>
					<ul class="mt-6 grid gap-4 sm:grid-cols-2">
						{FEATURES.map((feature) => (
							<li
								key={feature.title}
								class={card}
							>
								<h3 class="font-semibold">{feature.title}</h3>
								<p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
									{feature.text}
								</p>
							</li>
						))}
					</ul>
				</section>

				<section
					aria-labelledby="start-title"
					class="py-6"
				>
					<h2
						id="start-title"
						class="text-2xl font-semibold tracking-tight"
					>
						Quick start
					</h2>
					<ol class="mt-4 list-decimal space-y-1 pl-5 text-neutral-700 dark:text-neutral-300">
						{STEPS.map((step) => (
							<li key={step}>{step}</li>
						))}
					</ol>
					<div class={`${card} mt-6`}>
						<div class="flex items-center justify-between gap-3">
							<h3 class="font-semibold">Stars of any repository</h3>
							<CopyButton text={snippet} />
						</div>
						<pre
							tabIndex={0}
							class="mt-4 overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs leading-relaxed select-all sm:text-sm dark:bg-neutral-900"
						>
							{snippet}
						</pre>
						<p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
							Replace <code>owner/repo</code> with your repository, or let the
							builder do it.
						</p>
					</div>
					<div class="mt-6">
						<a
							href="/builder"
							class={primary}
						>
							Open the builder
						</a>
					</div>
				</section>
			</main>

			<footer class="border-t border-neutral-200 dark:border-neutral-800">
				<div class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-neutral-500 sm:px-6 dark:text-neutral-400">
					<span>Plaque, MIT license</span>
					<a
						href={GITHUB_URL}
						class="rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
					>
						Source on GitHub
					</a>
				</div>
			</footer>
		</>
	)
}
