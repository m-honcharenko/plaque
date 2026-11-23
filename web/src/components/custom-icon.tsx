import { useState } from "preact/hooks"

import { ICON_PATH_MAX_LENGTH } from "../../../src/core/icons/custom-icon.js"
import { fetchSvg } from "../fetch-svg.js"
import { MAX_SVG_LENGTH, extractIconPath } from "../svg-path.js"
import { button, errorText, hint, input } from "../ui.js"

type CustomIconProps = {
	path: string | null
	// Line width when the icon is an outline, null when it is filled.
	stroke: number | null
	onChange: (path: string | null, stroke: number | null) => void
}

const secondary = `${button} border-neutral-300 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800`

// Your own icon: from a file, from pasted code or from a link. Only the
// drawing is kept, as one path; the rest of the file is dropped on the spot.
export function CustomIcon({ path, stroke, onChange }: CustomIconProps) {
	const [error, setError] = useState<string | null>(null)
	const [notes, setNotes] = useState<string[]>([])
	const [busy, setBusy] = useState(false)
	const [code, setCode] = useState("")
	const [link, setLink] = useState("")

	function use(text: string): boolean {
		const result = extractIconPath(text)
		if (!result.ok) {
			setError(result.error)
			setNotes([])
			return false
		}
		setError(null)
		setNotes(result.notes)
		onChange(result.path, result.stroke)
		return true
	}

	async function fromFile(file: File) {
		if (file.size > MAX_SVG_LENGTH) {
			setError("The file is too big for an icon (over 100 KB).")
			setNotes([])
			return
		}
		use(await file.text())
	}

	async function fromLink() {
		setBusy(true)
		const fetched = await fetchSvg(link)
		setBusy(false)
		if (!fetched.ok) {
			setError(fetched.error)
			setNotes([])
			return
		}
		use(fetched.text)
	}

	return (
		<div class="mt-1 space-y-4">
			<div class="flex items-center gap-3">
				<span
					class="flex size-12 shrink-0 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700"
					aria-hidden="true"
				>
					{path === null ? (
						<span class="text-xs text-neutral-400">none</span>
					) : (
						<svg
							viewBox="0 0 24 24"
							class="size-7"
							fill={stroke === null ? "currentColor" : "none"}
							stroke={stroke === null ? undefined : "currentColor"}
							stroke-width={stroke ?? undefined}
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d={path} />
						</svg>
					)}
				</span>
				<div class="min-w-0 flex-1">
					<p class="text-sm">
						{path === null ? "No custom icon yet" : "Custom icon is set"}
					</p>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						{path === null
							? "Any SVG: it is fitted to the grid and drawn in the theme color."
							: `${stroke === null ? "Filled" : "Outline"}, ${path.length}/${ICON_PATH_MAX_LENGTH} characters`}
					</p>
				</div>
				{path === null ? null : (
					<button
						type="button"
						class={secondary}
						onClick={() => {
							onChange(null, null)
							setError(null)
							setNotes([])
						}}
					>
						Remove
					</button>
				)}
			</div>

			<div>
				<label
					for="icon-file"
					class="block text-sm font-medium"
				>
					From a file
				</label>
				<input
					id="icon-file"
					type="file"
					accept=".svg,image/svg+xml"
					onChange={(event) => {
						const file = event.currentTarget.files?.[0]
						event.currentTarget.value = ""
						if (file !== undefined) void fromFile(file)
					}}
					class="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-neutral-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium dark:file:border-neutral-700 dark:file:bg-neutral-900"
				/>
			</div>

			<div>
				<label
					for="icon-link"
					class="block text-sm font-medium"
				>
					From a link
				</label>
				<div class="mt-1 flex gap-2">
					<input
						id="icon-link"
						type="url"
						value={link}
						placeholder="https://example.com/icon.svg"
						autocomplete="off"
						spellcheck={false}
						onInput={(event) => setLink(event.currentTarget.value)}
						class={input}
					/>
					<button
						type="button"
						disabled={busy || link.trim() === ""}
						onClick={() => void fromLink()}
						class={secondary}
					>
						{busy ? "Loading" : "Load"}
					</button>
				</div>
				<p class={hint}>
					Your browser loads the file, Plaque never does. The site has to allow
					it (CORS); a GitHub file page link works too.
				</p>
			</div>

			<div>
				<label
					for="icon-code"
					class="block text-sm font-medium"
				>
					Or paste SVG code
				</label>
				<textarea
					id="icon-code"
					rows={3}
					value={code}
					placeholder='<svg viewBox="0 0 24 24"><path d="..."/></svg>'
					spellcheck={false}
					onInput={(event) => setCode(event.currentTarget.value)}
					class={`${input} font-mono text-sm`}
				/>
				<button
					type="button"
					disabled={code.trim() === ""}
					onClick={() => {
						if (use(code)) setCode("")
					}}
					class={`${secondary} mt-2`}
				>
					Use this code
				</button>
			</div>

			{error === null ? null : (
				<p
					class={errorText}
					role="alert"
				>
					{error}
				</p>
			)}
			{notes.length === 0 ? null : (
				<ul class="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">
					{notes.map((note) => (
						<li key={note}>{note}</li>
					))}
				</ul>
			)}
		</div>
	)
}
