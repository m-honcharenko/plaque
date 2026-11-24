import { useEffect, useState } from "preact/hooks"

import { button } from "../ui.js"

type CopyButtonProps = {
	// Nothing to copy yet disables the button.
	text: string | null
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

export function CopyButton({ text }: CopyButtonProps) {
	const [copy, setCopy] = useState<CopyState>("idle")
	useEffect(() => {
		if (copy === "idle") return
		const timer = setTimeout(() => setCopy("idle"), 2000)
		return () => clearTimeout(timer)
	}, [copy])

	return (
		<button
			type="button"
			disabled={text === null}
			onClick={async () => {
				if (text === null) return
				setCopy((await copyText(text)) ? "copied" : "failed")
			}}
			class={`${button} border-neutral-300 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800`}
		>
			{copy === "copied"
				? "Copied"
				: copy === "failed"
					? "Select and copy"
					: "Copy"}
		</button>
	)
}
