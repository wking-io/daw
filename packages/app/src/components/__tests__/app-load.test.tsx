import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createRoot, type VirtualRoot } from "@remix-run/component";
import { AppLoad } from "../app-load";

describe("AppLoad", () => {
	let container: HTMLDivElement;
	let root: VirtualRoot;

	beforeEach(() => {
		container = document.createElement("div");
		root = createRoot(container);
	});

	afterEach(() => {
		root.remove();
	});

	describe("rendering", () => {
		it("renders the message prop", () => {
			root.render(<AppLoad message="Loading..." />);
			root.flush();

			const p = container.querySelector("p");
			expect(p).not.toBeNull();
			expect(p?.textContent).toBe("Loading...");
		});

		it("renders the AsciiLoader component", () => {
			root.render(<AppLoad message="Loading..." />);
			root.flush();

			const pre = container.querySelector("pre");
			expect(pre).not.toBeNull();
			expect(pre?.classList.contains("font-mono")).toBe(true);
		});

		it("has proper layout classes on container", () => {
			root.render(<AppLoad message="Loading..." />);
			root.flush();

			const div = container.querySelector("div");
			expect(div).not.toBeNull();
			expect(div?.classList.contains("flex")).toBe(true);
			expect(div?.classList.contains("flex-col")).toBe(true);
			expect(div?.classList.contains("items-center")).toBe(true);
			expect(div?.classList.contains("justify-center")).toBe(true);
			expect(div?.classList.contains("h-full")).toBe(true);
			expect(div?.classList.contains("gap-4")).toBe(true);
		});
	});
});
