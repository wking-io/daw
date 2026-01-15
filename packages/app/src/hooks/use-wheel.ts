import { useEffect, useRef } from 'react'

export function useWheel(
	ref: React.RefObject<HTMLElement | null>,
	onWheel: (deltaY: number) => void,
) {
	const onWheelRef = useRef(onWheel)
	onWheelRef.current = onWheel

	useEffect(() => {
		const element = ref.current
		if (!element) return

		const handler = (e: WheelEvent) => {
			e.preventDefault()
			onWheelRef.current(e.deltaY)
		}

		element.addEventListener('wheel', handler, { passive: false })
		return () => element.removeEventListener('wheel', handler)
	}, [ref])
}
