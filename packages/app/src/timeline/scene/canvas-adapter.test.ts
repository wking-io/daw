import { describe, expect, it, mock, beforeEach } from "bun:test";
import { renderToCanvas } from "./canvas-adapter";
import { point, rect, stroke, textStyle } from "./types";
import type { SceneNode } from "./types";

describe("timeline/scene/canvas-adapter", () => {
  // Create a mock canvas context
  function createMockContext() {
    return {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "start" as CanvasTextAlign,
      textBaseline: "alphabetic" as CanvasTextBaseline,
      fillRect: mock(() => {}),
      strokeRect: mock(() => {}),
      beginPath: mock(() => {}),
      moveTo: mock(() => {}),
      lineTo: mock(() => {}),
      stroke: mock(() => {}),
      fillText: mock(() => {}),
      save: mock(() => {}),
      restore: mock(() => {}),
      rect: mock(() => {}),
      clip: mock(() => {}),
    } as unknown as CanvasRenderingContext2D;
  }

  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("empty nodes", () => {
    it("does nothing for empty node list", () => {
      renderToCanvas(ctx, []);
      expect(ctx.fillRect).not.toHaveBeenCalled();
      expect(ctx.strokeRect).not.toHaveBeenCalled();
    });
  });

  describe("rect nodes", () => {
    it("renders filled rect", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "rect",
          rect: rect(10, 20, 100, 50),
          fill: "red",
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.fillStyle).toBe("red");
      expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 100, 50);
      expect(ctx.strokeRect).not.toHaveBeenCalled();
    });

    it("renders stroked rect", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "rect",
          rect: rect(10, 20, 100, 50),
          stroke: stroke("blue", 2),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.strokeStyle).toBe("blue");
      expect(ctx.lineWidth).toBe(2);
      expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 50);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it("renders filled and stroked rect", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "rect",
          rect: rect(10, 20, 100, 50),
          fill: "red",
          stroke: stroke("blue", 2),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 100, 50);
      expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 50);
    });

    it("renders rect with no fill or stroke", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "rect",
          rect: rect(10, 20, 100, 50),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.fillRect).not.toHaveBeenCalled();
      expect(ctx.strokeRect).not.toHaveBeenCalled();
    });
  });

  describe("line nodes", () => {
    it("renders a simple line", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "line",
          points: [point(0, 0), point(100, 100)],
          stroke: stroke("black", 1),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(ctx.lineTo).toHaveBeenCalledWith(100, 100);
      expect(ctx.strokeStyle).toBe("black");
      expect(ctx.lineWidth).toBe(1);
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("renders a multi-point line", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "line",
          points: [point(0, 0), point(50, 50), point(100, 0)],
          stroke: stroke("red", 2),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(ctx.lineTo).toHaveBeenCalledWith(50, 50);
      expect(ctx.lineTo).toHaveBeenCalledWith(100, 0);
    });

    it("does not render line with fewer than 2 points", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "line",
          points: [point(0, 0)],
          stroke: stroke("black", 1),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it("does not render line with empty points", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "line",
          points: [],
          stroke: stroke("black", 1),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.beginPath).not.toHaveBeenCalled();
    });
  });

  describe("text nodes", () => {
    it("renders text with basic style", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "text",
          position: point(10, 20),
          text: "Hello World",
          style: textStyle("12px Arial", "black"),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.font).toBe("12px Arial");
      expect(ctx.fillStyle).toBe("black");
      expect(ctx.fillText).toHaveBeenCalledWith("Hello World", 10, 20);
    });

    it("renders text with align and baseline", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "text",
          position: point(10, 20),
          text: "Centered",
          style: textStyle("14px sans-serif", "blue", "center", "middle"),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.textAlign).toBe("center");
      expect(ctx.textBaseline).toBe("middle");
    });

    it("does not set align/baseline when not specified", () => {
      const originalAlign = ctx.textAlign;
      const originalBaseline = ctx.textBaseline;

      const nodes: SceneNode<never>[] = [
        {
          kind: "text",
          position: point(10, 20),
          text: "Test",
          style: textStyle("12px Arial", "black"),
        },
      ];
      renderToCanvas(ctx, nodes);

      // Should remain unchanged
      expect(ctx.textAlign).toBe(originalAlign);
      expect(ctx.textBaseline).toBe(originalBaseline);
    });
  });

  describe("group nodes", () => {
    it("renders children in order", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "group",
          children: [
            { kind: "rect", rect: rect(0, 0, 50, 50), fill: "red" },
            { kind: "rect", rect: rect(25, 25, 50, 50), fill: "blue" },
          ],
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledTimes(2);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("applies clip region when specified", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "group",
          children: [{ kind: "rect", rect: rect(0, 0, 200, 200), fill: "red" }],
          clip: rect(10, 10, 100, 100),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.rect).toHaveBeenCalledWith(10, 10, 100, 100);
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("does not call clip when not specified", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "group",
          children: [{ kind: "rect", rect: rect(0, 0, 50, 50), fill: "red" }],
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.clip).not.toHaveBeenCalled();
    });

    it("handles nested groups", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "group",
          children: [
            {
              kind: "group",
              children: [{ kind: "rect", rect: rect(0, 0, 50, 50), fill: "red" }],
            },
          ],
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.save).toHaveBeenCalledTimes(2);
      expect(ctx.restore).toHaveBeenCalledTimes(2);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it("handles empty group", () => {
      const nodes: SceneNode<never>[] = [
        {
          kind: "group",
          children: [],
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });

  describe("multiple nodes", () => {
    it("renders all node types in sequence", () => {
      const nodes: SceneNode<never>[] = [
        { kind: "rect", rect: rect(0, 0, 50, 50), fill: "red" },
        {
          kind: "line",
          points: [point(0, 0), point(100, 100)],
          stroke: stroke("black", 1),
        },
        {
          kind: "text",
          position: point(10, 20),
          text: "Hello",
          style: textStyle("12px Arial", "black"),
        },
      ];
      renderToCanvas(ctx, nodes);

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
    });
  });
});
