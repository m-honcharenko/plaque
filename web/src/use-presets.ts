import { useState } from "preact/hooks"

import type { BuilderState } from "./builder-state.js"
import {
	readPresets,
	removePreset,
	savePreset,
	writePresets,
	type Preset
} from "./presets.js"

type Presets = {
	saved: Preset[]
	// Returns the problem to show, or null when the preset was saved.
	save: (name: string, state: BuilderState) => string | null
	remove: (name: string) => void
}

// The presets the person saved: kept in this browser only.
export function usePresets(): Presets {
	const [saved, setSaved] = useState<Preset[]>(() => readPresets())
	const keep = (next: Preset[]) => {
		setSaved(next)
		writePresets(next)
	}
	return {
		saved,
		save(name, state) {
			const result = savePreset(saved, name, state)
			if (!result.ok) return result.error
			keep(result.presets)
			return null
		},
		remove(name) {
			keep(removePreset(saved, name))
		}
	}
}
