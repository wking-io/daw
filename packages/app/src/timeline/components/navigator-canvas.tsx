import type { Handle } from '@remix-run/component'

import type { SceneRenderer } from '../renderers/types'
import { NavigatorRoot } from './navigator-root'
import type { NavigatorRootContext } from './navigator-root'
import { TimelineCanvas } from './timeline-canvas'
import { TimelineRoot } from './timeline-root'
import type { TimelineRootContext } from './timeline-root'

export function NavigatorCanvas(handle: Handle) {
	const rootCtx: TimelineRootContext = handle.context.get(TimelineRoot)
	const navCtx: NavigatorRootContext = handle.context.get(NavigatorRoot)

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
				projection={navCtx.projection}
				size={navCtx.size}
				height={navCtx.height}
				surface="navigator"
				fitToHeight={true}
				renderer={props.renderer}
				data={props.data ?? {}}
				ui={props.ui ?? {}}
				class={props.class}
			/>
		)
	}
}
