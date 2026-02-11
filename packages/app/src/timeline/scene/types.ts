// =============================================================================
// Geometry Primitives
// =============================================================================

export type Point = Readonly<{
	x: number
	y: number
}>

export type Rect = Readonly<{
	x: number
	y: number
	width: number
	height: number
}>

// =============================================================================
// Style Types
// =============================================================================

export type Stroke = Readonly<{
	color: string
	width: number
}>

export type TextStyle = Readonly<{
	font: string
	color: string
	align?: CanvasTextAlign
	baseline?: CanvasTextBaseline
}>

// =============================================================================
// Scene Node Types
// =============================================================================

export type RectNode = Readonly<{
	kind: 'rect'
	rect: Rect
	fill?: string
	stroke?: Stroke
}>

export type LineNode = Readonly<{
	kind: 'line'
	points: readonly Point[]
	stroke: Stroke
}>

export type TextNode = Readonly<{
	kind: 'text'
	position: Point
	text: string
	style: TextStyle
}>

export type GroupNode<Action> = Readonly<{
	kind: 'group'
	children: readonly SceneNode<Action>[]
	clip?: Rect
}>

/**
 * A scene node represents a visual element in the scene graph.
 * The Action type parameter is used for interactive nodes that can trigger actions.
 */
export type SceneNode<Action> =
	| RectNode
	| LineNode
	| TextNode
	| GroupNode<Action>

/**
 * An interactive node extends a scene node with an optional action.
 * When the node is clicked/tapped, the action is dispatched.
 */
export type InteractiveNode<Action> = SceneNode<Action> &
	Readonly<{ action?: Action }>

// =============================================================================
// Scene Output
// =============================================================================

/**
 * A Scene represents the complete visual output from a renderer.
 * It is split into two layers:
 * - canvas: Visual-only nodes rendered to a <canvas> element
 * - dom: Interactive nodes rendered as React elements (for text, accessibility, events)
 */
export type Scene<Action> = Readonly<{
	/** Nodes rendered to canvas - no interactivity */
	canvas: readonly SceneNode<never>[]
	/** Nodes rendered to DOM - can have actions for interactivity */
	dom: readonly InteractiveNode<Action>[]
}>

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a Point from x and y coordinates.
 */
export function point(x: number, y: number): Point {
	return { x, y }
}

/**
 * Create a Rect from position and dimensions.
 */
export function rect(
	x: number,
	y: number,
	width: number,
	height: number,
): Rect {
	return { x, y, width, height }
}

/**
 * Create a Stroke style.
 */
export function stroke(color: string, width: number): Stroke {
	return { color, width }
}

/**
 * Create a TextStyle.
 */
export function textStyle(
	font: string,
	color: string,
	align?: CanvasTextAlign,
	baseline?: CanvasTextBaseline,
): TextStyle {
	return { font, color, align, baseline }
}

/**
 * Check if a point is inside a rect.
 */
export function pointInRect(p: Point, r: Rect): boolean {
	return (
		p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
	)
}

/**
 * Get the bounding rect for a node.
 * For groups, this returns undefined (groups don't have inherent bounds).
 */
export function nodeBounds<A>(node: SceneNode<A>): Rect | undefined {
	switch (node.kind) {
		case 'rect':
			return node.rect
		case 'line': {
			if (node.points.length === 0) return undefined
			let minX = node.points[0]!.x
			let minY = node.points[0]!.y
			let maxX = minX
			let maxY = minY
			for (const p of node.points) {
				if (p.x < minX) minX = p.x
				if (p.y < minY) minY = p.y
				if (p.x > maxX) maxX = p.x
				if (p.y > maxY) maxY = p.y
			}
			return {
				x: minX,
				y: minY,
				width: maxX - minX,
				height: maxY - minY,
			}
		}
		case 'text':
			// Text bounds are approximate - we don't have font metrics here
			return undefined
		case 'group':
			return undefined
	}
}
