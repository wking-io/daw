import type { Handle } from '@remix-run/component'

import type { SceneRenderer } from '../renderers/types'
import { NavigatorRoot } from './navigator-root'
import type { NavigatorRootContext } from './navigator-root'
import { TimelineCanvas } from './timeline-canvas'

export function NavigatorCanvas(handle: Handle) {
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
