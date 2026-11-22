// The page's own color scheme, not the badge theme: a badge's "auto" follows
// the reader's system, this follows the switch in the corner.
export const UI_THEMES = ["system", "light", "dark"] as const
export type UiTheme = (typeof UI_THEMES)[number]

export const DEFAULT_UI_THEME: UiTheme = "system"
export const STORAGE_KEY = "plaque-theme"

// Anything unknown, including null, falls back to the default.
export function parseUiTheme(raw: string | null): UiTheme {
	return (UI_THEMES as readonly (string | null)[]).includes(raw)
		? (raw as UiTheme)
		: DEFAULT_UI_THEME
}

export function isDark(theme: UiTheme, systemDark: boolean): boolean {
	return theme === "system" ? systemDark : theme === "dark"
}

export function readStoredTheme(): UiTheme {
	try {
		return parseUiTheme(localStorage.getItem(STORAGE_KEY))
	} catch {
		return DEFAULT_UI_THEME
	}
}

export function storeTheme(theme: UiTheme): void {
	try {
		if (theme === DEFAULT_UI_THEME) localStorage.removeItem(STORAGE_KEY)
		else localStorage.setItem(STORAGE_KEY, theme)
	} catch {
		// Private mode and the like: the choice just does not persist.
	}
}

const DARK_QUERY = "(prefers-color-scheme: dark)"

export function systemPrefersDark(): boolean {
	return window.matchMedia(DARK_QUERY).matches
}

export function applyTheme(theme: UiTheme): void {
	document.documentElement.classList.toggle(
		"dark",
		isDark(theme, systemPrefersDark())
	)
}

// Calls back when the system theme changes; returns the unsubscribe.
export function watchSystemTheme(onChange: () => void): () => void {
	const query = window.matchMedia(DARK_QUERY)
	query.addEventListener("change", onChange)
	return () => query.removeEventListener("change", onChange)
}
