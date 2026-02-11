import type { Handle } from '@remix-run/component'

import type { SceneRenderer } from '../renderers/types'
import { ProjectionRoot } from './projection-root'
import type { ProjectionRootContext } from './projection-root'
import { TimelineCanvas } from './timeline-canvas'
import { TimelineRoot } from './timeline-root'
import type { TimelineRootContext } from './timeline-root'

export function ProjectionCanvas(handle: Handle) {
	const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot)
	const projCtx: ProjectionRootContext = handle.context.get(ProjectionRoot)

	return (props: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		renderer: SceneRenderer<any, any, any>
		data?: unknown
		ui?: unknown
		class?: string
	}) => {
		return (
			<TimelineCanvas
				dpr={rootCtx.dpr}
				projection={projCtx.projection}
				size={projCtx.size}
				height={projCtx.height}
				surface="main"
				fitToHeight={true}
				renderer={props.renderer}
				data={props.data ?? {}}
				ui={props.ui ?? {}}
				class={props.class}
			/>
		)
	}
}
