// Tailwind class strings shared by the form controls.
export const card =
	"rounded-xl border border-neutral-200 p-4 sm:p-6 dark:border-neutral-800"

export const input =
	"w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base " +
	"placeholder:text-neutral-400 focus:border-blue-600 focus:outline-none " +
	"focus:ring-2 focus:ring-blue-600/30 dark:border-neutral-700 " +
	"dark:bg-neutral-900"

export const inputError =
	"border-red-600 focus:border-red-600 focus:ring-red-600/30"

export const labelText = "block text-sm font-medium"

export const hint = "mt-1 text-sm text-neutral-500 dark:text-neutral-400"

export const errorText = "mt-1 text-sm text-red-600 dark:text-red-400"

export const button =
	"inline-flex items-center justify-center rounded-lg border px-3 py-2 " +
	"text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/40"

// The surface a badge with theme "auto" is judged on. It follows the
// system, like the badge, so it uses the media query and not the page
// theme (the "dark:" variant).
export const autoSurface =
	"bg-neutral-50 text-neutral-900 [@media(prefers-color-scheme:dark)]:bg-neutral-900 [@media(prefers-color-scheme:dark)]:text-neutral-100"
