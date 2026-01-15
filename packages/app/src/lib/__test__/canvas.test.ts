import { describe, expect, it, vi } from "vitest";
import { prepareCanvas } from "../canvas";

describe("lib/canvas", () => {
	it("prepares canvas dimensions and transforms", () => {
		const canvas = document.createElement("canvas");
		const ctx = {
			setTransform: vi.fn(),
			clearRect: vi.fn(),
		} as unknown as CanvasRenderingContext2D;

		Object.defineProperty(canvas, "getContext", {
			value: vi.fn().mockReturnValue(ctx),
		});

		const result = prepareCanvas({
			canvas,
			cssW: 200,
			cssH: 100,
			dpr: 2,
		});

		expect(result).toBe(ctx);
		expect(canvas.width).toBe(400);
		expect(canvas.height).toBe(200);
		expect(canvas.style.width).toBe("200px");
		expect(canvas.style.height).toBe("100px");
		expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
		expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 200, 100);
	});

	it("returns null when context is missing", () => {
		const canvas = document.createElement("canvas");
		Object.defineProperty(canvas, "getContext", {
			value: vi.fn().mockReturnValue(null),
		});

		const result = prepareCanvas({
			canvas,
			cssW: 10,
			cssH: 10,
			dpr: 1,
		});

		expect(result).toBeNull();
	});
});
