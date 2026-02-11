export function prepareCanvas({
	canvas,
	cssW,
	cssH,
	dpr,
}: {
	canvas: HTMLCanvasElement
	cssW: number
	cssH: number
	dpr: number
}): CanvasRenderingContext2D | null {
	const ctx = canvas.getContext('2d')
	if (!ctx) return null

	canvas.width = cssW * dpr
	canvas.height = cssH * dpr
	canvas.style.width = `${cssW}px`
	canvas.style.height = `${cssH}px`
	ctx.scale(dpr, dpr)

	return ctx
}
