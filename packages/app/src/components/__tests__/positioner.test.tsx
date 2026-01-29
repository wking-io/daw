import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { Positioner, PositionerArrow } from "../ui/positioner";

describe("Positioner", () => {
	it("renders children", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		root.render(
			<Positioner setup={{}} anchor={null}>
				<span class="test-child">Content</span>
			</Positioner>,
		);
		root.flush();

		const child = container.querySelector(".test-child");
		expect(child).not.toBeNull();
		expect(child?.textContent).toBe("Content");
	});

	it("sets data-side attribute", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		root.render(
			<Positioner setup={{}} anchor={null} side="top">
				<span>Content</span>
			</Positioner>,
		);
		root.flush();

		const el = container.querySelector("[data-side]");
		expect(el).not.toBeNull();
		expect(el?.getAttribute("data-side")).toBe("bottom");
	});

	it("sets data-align attribute", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		root.render(
			<Positioner setup={{}} anchor={null} align="start">
				<span>Content</span>
			</Positioner>,
		);
		root.flush();

		const el = container.querySelector("[data-align]");
		expect(el).not.toBeNull();
		expect(el?.getAttribute("data-align")).toBe("center");
	});

	it("initially renders with visibility hidden (before positioning)", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		root.render(
			<Positioner setup={{}} anchor={null}>
				<span>Content</span>
			</Positioner>,
		);
		root.flush();

		const el = container.querySelector("[data-side]") as HTMLElement;
		expect(el).not.toBeNull();
		expect(el?.style.visibility).toBe("hidden");
	});

	it("applies custom class", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		root.render(
			<Positioner setup={{}} anchor={null} class="custom-positioner">
				<span>Content</span>
			</Positioner>,
		);
		root.flush();

		const el = container.querySelector(".custom-positioner");
		expect(el).not.toBeNull();
	});

	describe("PositionerArrow", () => {
		it("renders within Positioner context", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Positioner setup={{}} anchor={null}>
					<PositionerArrow setup={{}} class="arrow" />
				</Positioner>,
			);
			root.flush();

			const arrow = container.querySelector(".arrow");
			expect(arrow).not.toBeNull();

			const svg = arrow?.querySelector("svg");
			expect(svg).not.toBeNull();
		});
	});
});
