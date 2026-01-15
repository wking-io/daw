export type CanvasCtx = CanvasRenderingContext2D

export function prepareCanvas(args: {
	canvas: HTMLCanvasElement
	cssW: number
	cssH: number
	dpr: number
}): CanvasCtx | null {
	const { canvas, cssW, cssH, dpr } = args

	const w = Math.max(1, Math.floor(cssW * dpr))
	const h = Math.max(1, Math.floor(cssH * dpr))

	if (canvas.width !== w) canvas.width = w
	if (canvas.height !== h) canvas.height = h

	canvas.style.width = `${cssW}px`
	canvas.style.height = `${cssH}px`

	const ctx = canvas.getContext('2d')
	if (!ctx) return null

	// draw in CSS px space
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	ctx.clearRect(0, 0, cssW, cssH)
	return ctx
}
