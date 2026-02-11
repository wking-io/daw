import type { Handle, RemixNode } from '@remix-run/component'
import { cn } from '@daw/utils'

export function NavigatorContent(_handle: Handle) {
	return (props: { children?: RemixNode; class?: string }) => {
		return (
			<div class={cn('pointer-events-none absolute inset-0', props.class)}>
				{props.children}
			</div>
		)
	}
}
