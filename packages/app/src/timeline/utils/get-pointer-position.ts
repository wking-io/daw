import { clamp } from '@daw/core/lib/math'

export function getPointerPosition(
	e: PointerEvent,
	element?: HTMLElement | null,
): { x: number; y: number } {
	if (!element) return { x: e.clientX, y: e.clientY }
	// Use getBoundingClientRect() for viewport-relative coordinates
	// (ResizeObserver's contentRect.left/top are element-relative, always ~0)
	const rect = element.getBoundingClientRect()
	const x = clamp(e.clientX - rect.left, 0, rect.width)
	const y = clamp(e.clientY - rect.top, 0, rect.height)
	return { x, y }
}
