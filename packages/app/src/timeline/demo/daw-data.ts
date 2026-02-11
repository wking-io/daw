import * as Px from '@daw/core/lib/px'
import type { DawData } from '../renderers/daw-skeleton/types'

// Tailwind color palette
const colors = {
	orange500: '#f97316',
	violet500: '#8b5cf6',
	cyan500: '#06b6d4',
	pink500: '#ec4899',
	emerald500: '#10b981',
	blue500: '#3b82f6',
	amber500: '#f59e0b',
	rose500: '#f43f5e',
} as const

export const demoDawData: DawData = {
	tracks: [
		{ id: 't1', name: 'Drums', color: colors.orange500 },
		{ id: 't2', name: 'Bass', color: colors.violet500 },
		{ id: 't3', name: 'Keys', color: colors.cyan500 },
		{ id: 't4', name: 'Vox', color: colors.pink500 },
		{ id: 't5', name: 'FX', color: colors.emerald500 },
		{ id: 't6', name: 'Pads', color: colors.blue500 },
		{ id: 't7', name: 'Lead', color: colors.amber500 },
		{ id: 't8', name: 'Perc', color: colors.rose500 },
	],
	clips: [
		// Drums (t1)
		{
			id: 'c1',
			trackId: 't1',
			start: Px.Px(2200),
			end: Px.Px(3400),
			title: 'Beat A',
		},
		{
			id: 'c2',
			trackId: 't1',
			start: Px.Px(3600),
			end: Px.Px(5200),
			title: 'Beat B',
		},
		// Bass (t2)
		{
			id: 'c3',
			trackId: 't2',
			start: Px.Px(2600),
			end: Px.Px(6000),
			title: 'Bassline',
		},
		// Keys (t3)
		{
			id: 'c4',
			trackId: 't3',
			start: Px.Px(3100),
			end: Px.Px(4700),
			title: 'Chords',
		},
		{
			id: 'c5',
			trackId: 't3',
			start: Px.Px(5000),
			end: Px.Px(6200),
			title: 'Bridge',
		},
		// Vox (t4)
		{
			id: 'c6',
			trackId: 't4',
			start: Px.Px(4800),
			end: Px.Px(5900),
			title: 'Verse',
		},
		{
			id: 'c7',
			trackId: 't4',
			start: Px.Px(6100),
			end: Px.Px(7400),
			title: 'Chorus',
		},
		// FX (t5)
		{
			id: 'c8',
			trackId: 't5',
			start: Px.Px(2000),
			end: Px.Px(2800),
			title: 'Riser',
		},
		{
			id: 'c9',
			trackId: 't5',
			start: Px.Px(4400),
			end: Px.Px(5000),
			title: 'Impact',
		},
		// Pads (t6)
		{
			id: 'c10',
			trackId: 't6',
			start: Px.Px(2400),
			end: Px.Px(5600),
			title: 'Atmosphere',
		},
		// Lead (t7)
		{
			id: 'c11',
			trackId: 't7',
			start: Px.Px(3800),
			end: Px.Px(4600),
			title: 'Hook',
		},
		{
			id: 'c12',
			trackId: 't7',
			start: Px.Px(5400),
			end: Px.Px(6400),
			title: 'Solo',
		},
		// Perc (t8)
		{
			id: 'c13',
			trackId: 't8',
			start: Px.Px(2200),
			end: Px.Px(3200),
			title: 'Shaker',
		},
		{
			id: 'c14',
			trackId: 't8',
			start: Px.Px(3400),
			end: Px.Px(4200),
			title: 'Tamb',
		},
		{
			id: 'c15',
			trackId: 't8',
			start: Px.Px(4600),
			end: Px.Px(5800),
			title: 'Congas',
		},
	],
}
