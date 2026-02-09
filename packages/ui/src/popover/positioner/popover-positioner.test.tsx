import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { PopoverRoot } from "../root/popover-root";
import { PopoverPositioner } from "./popover-positioner";
import { PopoverArrow } from "../arrow/popover-arrow";

describe("PopoverPositioner", () => {
  it("renders children", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(
      <PopoverRoot setup={{}}>
        <PopoverPositioner>
          <span class="test-child">Content</span>
        </PopoverPositioner>
      </PopoverRoot>,
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
      <PopoverRoot setup={{}}>
        <PopoverPositioner side="top">
          <span>Content</span>
        </PopoverPositioner>
      </PopoverRoot>,
    );
    root.flush();

    const el = container.querySelector("[data-side]");
    expect(el).not.toBeNull();
    // Without a trigger, it defaults to "bottom"
    expect(el?.getAttribute("data-side")).toBe("bottom");
  });

  it("sets data-align attribute", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(
      <PopoverRoot setup={{}}>
        <PopoverPositioner align="start">
          <span>Content</span>
        </PopoverPositioner>
      </PopoverRoot>,
    );
    root.flush();

    const el = container.querySelector("[data-align]");
    expect(el).not.toBeNull();
    // Without a trigger, it defaults to "center"
    expect(el?.getAttribute("data-align")).toBe("center");
  });

  it("initially renders with visibility hidden (before positioning)", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(
      <PopoverRoot setup={{}}>
        <PopoverPositioner>
          <span>Content</span>
        </PopoverPositioner>
      </PopoverRoot>,
    );

    const el = container.querySelector("[data-side]") as HTMLElement;
    expect(el).not.toBeNull();
    expect(el?.style.visibility).toBe("hidden");
  });

  it("applies custom class", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(
      <PopoverRoot setup={{}}>
        <PopoverPositioner class="custom-positioner">
          <span>Content</span>
        </PopoverPositioner>
      </PopoverRoot>,
    );
    root.flush();

    const el = container.querySelector(".custom-positioner");
    expect(el).not.toBeNull();
  });

  describe("PopoverArrow", () => {
    it("renders within Positioner context", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const arrow = container.querySelector(".arrow");
      expect(arrow).not.toBeNull();

      const svg = arrow?.querySelector("svg");
      expect(svg).not.toBeNull();
    });

    it("renders with custom dimensions", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow width={20} height={10} class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("20");
      expect(svg?.getAttribute("height")).toBe("10");
    });
  });
});
