import type { Handle, RemixNode } from '@remix-run/component'
import { cn } from '@daw/utils'

export function ProjectionContent(_handle: Handle) {
	return (props: {
		children?: RemixNode
		interactive?: boolean
		class?: string
	}) => {
		const interactive = props.interactive ?? true
		return (
			<div
				class={cn(
					'absolute inset-0',
					!interactive && 'pointer-events-none',
					props.class,
				)}
			>
				{props.children}
			</div>
		)
	}
}
