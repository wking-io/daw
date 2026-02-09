import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { PopoverArrow } from "./popover-arrow";
import { PopoverRoot } from "../root/popover-root";
import { PopoverPositioner } from "../positioner/popover-positioner";

describe("PopoverArrow", () => {
  describe("rendering", () => {
    it("renders a div element", () => {
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
      expect(arrow?.tagName).toBe("DIV");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow class="custom-arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const arrow = container.querySelector(".custom-arrow");
      expect(arrow).not.toBeNull();
    });

    it("contains an SVG element", () => {
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

      const svg = container.querySelector(".arrow svg");
      expect(svg).not.toBeNull();
    });
  });

  describe("without PopoverPositioner context", () => {
    it("renders a div with SVG", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<PopoverArrow class="standalone" />);
      root.flush();

      const arrow = container.querySelector(".standalone");
      expect(arrow).not.toBeNull();

      const svg = arrow?.querySelector("svg");
      expect(svg).not.toBeNull();
    });
  });

  describe("dimensions", () => {
    it("uses default dimensions (10x5)", () => {
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

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("10");
      expect(svg?.getAttribute("height")).toBe("5");
    });

    it("accepts custom width", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow width={20} class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("20");
    });

    it("accepts custom height", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow height={10} class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("height")).toBe("10");
    });

    it("accepts custom width and height", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow width={24} height={12} class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("24");
      expect(svg?.getAttribute("height")).toBe("12");
    });

    it("has viewBox matching dimensions", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow width={16} height={8} class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("viewBox")).toBe("0 0 16 8");
    });
  });

  describe("SVG structure", () => {
    it("has aria-hidden true", () => {
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

      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });

    it("contains a polygon element", () => {
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

      const polygon = container.querySelector("polygon");
      expect(polygon).not.toBeNull();
    });

    it("polygon has correct points for arrow shape", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow width={10} height={5} class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const polygon = container.querySelector("polygon");
      // Points should be: 0,5 5,0 10,5 (bottom-left, top-center, bottom-right)
      expect(polygon?.getAttribute("points")).toBe("0,5 5,0 10,5");
    });

    it("polygon points scale with dimensions", () => {
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

      const polygon = container.querySelector("polygon");
      // Points should be: 0,10 10,0 20,10
      expect(polygon?.getAttribute("points")).toBe("0,10 10,0 20,10");
    });
  });

  describe("positioning", () => {
    it("has absolute position style", () => {
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

      const arrow = container.querySelector(".arrow") as HTMLElement;
      expect(arrow?.style.position).toBe("absolute");
    });

    it("has width style matching prop", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow width={16} class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const arrow = container.querySelector(".arrow") as HTMLElement;
      expect(arrow?.style.width).toBe("16px");
    });

    it("has height style matching prop", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverPositioner>
            <PopoverArrow height={8} class="arrow" />
          </PopoverPositioner>
        </PopoverRoot>,
      );
      root.flush();

      const arrow = container.querySelector(".arrow") as HTMLElement;
      expect(arrow?.style.height).toBe("8px");
    });
  });
});
