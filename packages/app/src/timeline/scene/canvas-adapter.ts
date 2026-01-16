import type { Point, Rect, SceneNode } from "./types";

/**
 * Render a list of scene nodes to a Canvas 2D context.
 * This is the Canvas adapter for the scene graph.
 */
export function renderToCanvas(
	ctx: CanvasRenderingContext2D,
	nodes: readonly SceneNode<never>[],
): void {
	for (const node of nodes) {
		renderNode(ctx, node);
	}
}

function renderNode(
	ctx: CanvasRenderingContext2D,
	node: SceneNode<never>,
): void {
	switch (node.kind) {
		case "rect":
			renderRect(ctx, node.rect, node.fill, node.stroke);
			break;
		case "line":
			renderLine(ctx, node.points, node.stroke);
			break;
		case "text":
			renderText(ctx, node.position, node.text, node.style);
			break;
		case "group":
			renderGroup(ctx, node.children, node.clip);
			break;
	}
}

function renderRect(
	ctx: CanvasRenderingContext2D,
	{ x, y, width, height }: Rect,
	fill?: string,
	stroke?: { color: string; width: number },
): void {
	if (fill) {
		ctx.fillStyle = fill;
		ctx.fillRect(x, y, width, height);
	}

	if (stroke) {
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = stroke.width;
		ctx.strokeRect(x, y, width, height);
	}
}

function renderLine(
	ctx: CanvasRenderingContext2D,
	points: readonly Point[],
	stroke: { color: string; width: number },
): void {
	if (points.length < 2) return;

	ctx.beginPath();
	ctx.moveTo(Number(points[0]!.x), Number(points[0]!.y));

	for (let i = 1; i < points.length; i++) {
		ctx.lineTo(Number(points[i]!.x), Number(points[i]!.y));
	}

	ctx.strokeStyle = stroke.color;
	ctx.lineWidth = stroke.width;
	ctx.stroke();
}

function renderText(
	ctx: CanvasRenderingContext2D,
	{ x, y }: Point,
	text: string,
	style: {
		font: string;
		color: string;
		align?: CanvasTextAlign;
		baseline?: CanvasTextBaseline;
	},
): void {
	ctx.font = style.font;
	ctx.fillStyle = style.color;
	if (style.align) ctx.textAlign = style.align;
	if (style.baseline) ctx.textBaseline = style.baseline;

	ctx.fillText(text, x, y);
}

function renderGroup(
	ctx: CanvasRenderingContext2D,
	children: readonly SceneNode<never>[],
	clip?: Rect,
): void {
	ctx.save();

	if (clip) {
		ctx.beginPath();
		ctx.rect(clip.x, clip.y, clip.width, clip.height);
		ctx.clip();
	}

	for (const child of children) {
		renderNode(ctx, child);
	}

	ctx.restore();
}
