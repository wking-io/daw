import type { QN } from '@daw/core/lib/qn'

export type DawClip = Readonly<{
	id: string
	trackId: string
	start: QN
	end: QN
	title: string
}>

export type DawTrack = Readonly<{
	id: string
	name: string
	/** Track color used for clips. CSS color string (e.g. '#ff5500', 'rgba(255,85,0,1)') */
	color: string
}>

export type DawData = Readonly<{
	tracks: readonly DawTrack[]
	clips: readonly DawClip[]
}>

export type DawUiState = Readonly<{
	selectedClipId: string | null
}>

export type DawAction = Readonly<{ type: 'select-clip'; clipId: string | null }>
