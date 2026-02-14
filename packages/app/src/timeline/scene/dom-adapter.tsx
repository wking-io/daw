import type { RemixNode } from "@remix-run/component";

import type { InteractiveNode, Point, Rect, Stroke, TextStyle } from "./types";
import type { UIAction } from "../renderers/timeline/types";

/**
 * Render a list of interactive scene nodes to Remix elements.
 * This is the DOM adapter for the scene graph.
 */
export function renderToDom(
  nodes: readonly InteractiveNode<UIAction>[],
  dispatch: (action: UIAction) => void,
): RemixNode {
  return nodes.map((node, index) => (
    <SceneNodeElement key={index} node={node} dispatch={dispatch} />
  ));
}

function SceneNodeElement() {
  return (props: { node: InteractiveNode<UIAction>; dispatch: (action: UIAction) => void }) => {
    const { node, dispatch } = props;

    function handlePointerDown(e: PointerEvent) {
      if (node.action != null) {
        e.stopPropagation();
        dispatch(node.action);
      }
    }

    const interactive = node.action != null;
    const handlers = interactive ? { pointerdown: handlePointerDown } : {};

    switch (node.kind) {
      case "rect":
        return (
          <div
            style={rectToStyle(node.rect, node.fill, node.stroke)}
            on={handlers}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
          />
        );

      case "text":
        return (
          <span
            style={textToStyle(node.position, node.style)}
            on={handlers}
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
            style={groupToStyle(node.clip, node.borderRadius)}
            on={handlers}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
          >
            {node.children.map((child, index) => (
              <SceneNodeElement
                key={index}
                node={child as InteractiveNode<UIAction>}
                dispatch={dispatch}
              />
            ))}
          </div>
        );
    }
  };
}

function rectToStyle(rect: Rect, fill?: string, stroke?: Stroke): Record<string, string | number> {
  const border: Record<string, string | number> = stroke
    ? {
        borderColor: stroke?.color,
        borderWidth: stroke?.width,
        borderStyle: "solid",
      }
    : {};

  const background: Record<string, string | number> = fill
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

function textToStyle(
  { x, y }: Point,
  style: TextStyle,
): Record<string, string | number | undefined> {
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

function groupToStyle(clip?: Rect, borderRadius?: number): Record<string, string | number> {
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
    ...(borderRadius ? { borderRadius } : {}),
  };
}
