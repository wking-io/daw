import * as React from "react";

import type { InteractiveNode, Point, Rect, Stroke, TextStyle } from "./types";

/**
 * Render a list of interactive scene nodes to React elements.
 * This is the DOM adapter for the scene graph.
 */
export function renderToDom<Action>(
	nodes: readonly InteractiveNode<Action>[],
	dispatch: (action: Action) => void,
): React.ReactNode {
	return nodes.map((node, index) => (
		<SceneNodeElement key={index} node={node} dispatch={dispatch} />
	));
}

function SceneNodeElement<Action>({
	node,
	dispatch,
}: {
	node: InteractiveNode<Action>;
	dispatch: (action: Action) => void;
}): React.ReactElement | null {
	const handlePointerDown = React.useCallback(
		(e: React.PointerEvent) => {
			if (node.action != null) {
				e.stopPropagation();
				dispatch(node.action);
			}
		},
		[node.action, dispatch],
	);

	const interactive = node.action != null;
	const handlers = interactive ? { onPointerDown: handlePointerDown } : {};

	switch (node.kind) {
		case "rect":
			return (
				<div
					style={rectToStyle(node.rect, node.fill, node.stroke)}
					{...handlers}
					role={interactive ? "button" : undefined}
					tabIndex={interactive ? 0 : undefined}
				/>
			);

		case "text":
			return (
				<span
					style={textToStyle(node.position, node.style)}
					{...handlers}
					role={interactive ? "button" : undefined}
					tabIndex={interactive ? 0 : undefined}
				>
					{node.text}
				</span>
			);

		case "line":
			// Lines are typically canvas-only; skip in DOM
			return null;

		case "group":
			return (
				<div
					style={groupToStyle(node.clip)}
					{...handlers}
					role={interactive ? "button" : undefined}
					tabIndex={interactive ? 0 : undefined}
				>
					{node.children.map((child, index) => (
						<SceneNodeElement
							key={index}
							node={child as InteractiveNode<Action>}
							dispatch={dispatch}
						/>
					))}
				</div>
			);
	}
}

function rectToStyle(
	rect: Rect,
	fill?: string,
	stroke?: Stroke,
): React.CSSProperties {
	const border: React.CSSProperties = stroke
		? {
				borderColor: stroke?.color,
				borderWidth: stroke?.width,
				borderStyle: "solid",
			}
		: {};

	const background: React.CSSProperties = fill
		? {
				backgroundColor: fill,
			}
		: {};

	return {
		position: "absolute",
		left: rect.x,
		top: rect.y,
		width: rect.width,
		height: rect.height,
		boxSizing: "border-box",
		...background,
		...border,
	};
}

function textToStyle({ x, y }: Point, style: TextStyle): React.CSSProperties {
	// Handle vertical alignment based on baseline
	const verticalTransform =
		style.baseline === "middle"
			? "translateY(-50%)"
			: style.baseline === "bottom"
				? "translateY(-100%)"
				: undefined;

	return {
		position: "absolute",
		left: x,
		top: y,
		font: style.font,
		color: style.color,
		textAlign: style.align,
		whiteSpace: "nowrap",
		transform: verticalTransform,
	};
}

function groupToStyle(clip?: Rect): React.CSSProperties {
	if (!clip) {
		return {
			position: "absolute",
			inset: 0,
		};
	}

	return {
		position: "absolute",
		left: clip.x,
		top: clip.y,
		width: clip.width,
		height: clip.height,
		overflow: "hidden",
	};
}
