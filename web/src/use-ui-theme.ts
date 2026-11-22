import { useEffect, useState } from "preact/hooks"

import {
	applyTheme,
	readStoredTheme,
	storeTheme,
	watchSystemTheme,
	type UiTheme
} from "./theme.js"

// The page theme: remembered, applied to <html>, and kept in step with the
// system while "system" is chosen.
export function useUiTheme(): [UiTheme, (theme: UiTheme) => void] {
	const [theme, setTheme] = useState<UiTheme>(readStoredTheme)

	useEffect(() => {
		applyTheme(theme)
		if (theme !== "system") return
		return watchSystemTheme(() => applyTheme(theme))
	}, [theme])

	const choose = (next: UiTheme) => {
		storeTheme(next)
		setTheme(next)
	}
	return [theme, choose]
}
