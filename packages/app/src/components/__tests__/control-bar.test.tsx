import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { ControlBar } from "../control-bar";

describe("ControlBar", () => {
	describe("Root", () => {
		it("renders with fixed positioning and correct classes", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(<ControlBar.Root />);
			root.flush();

			const el = container.querySelector("div");
			expect(el).not.toBeNull();
			expect(el?.classList.contains("fixed")).toBe(true);
			expect(el?.classList.contains("top-0")).toBe(true);
		});

		it("renders children", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<ControlBar.Root>
					<span class="test-child">Child Content</span>
				</ControlBar.Root>,
			);
			root.flush();

			const child = container.querySelector(".test-child");
			expect(child).not.toBeNull();
			expect(child?.textContent).toBe("Child Content");
		});

		it("has data-tauri-drag-region attribute", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(<ControlBar.Root />);
			root.flush();

			const el = container.querySelector("[data-tauri-drag-region]");
			expect(el).not.toBeNull();
		});
	});

	describe("Content", () => {
		it("renders with flex class", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(<ControlBar.Content />);
			root.flush();

			const el = container.querySelector("div");
			expect(el?.classList.contains("flex")).toBe(true);
		});

		it("applies custom class", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(<ControlBar.Content class="custom-class" />);
			root.flush();

			const el = container.querySelector("div");
			expect(el?.classList.contains("custom-class")).toBe(true);
		});

		it("renders children", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<ControlBar.Content>
					<button type="button">Play</button>
					<button type="button">Stop</button>
				</ControlBar.Content>,
			);
			root.flush();

			const buttons = container.querySelectorAll("button");
			expect(buttons.length).toBe(2);
		});
	});
});
