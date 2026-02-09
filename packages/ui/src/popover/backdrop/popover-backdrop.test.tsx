import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { PopoverBackdrop } from "./popover-backdrop";
import { PopoverRoot } from "../root/popover-root";
import { PopoverTrigger } from "../trigger/popover-trigger";
import { PopoverPortal } from "../portal/popover-portal";

describe("PopoverBackdrop", () => {
  describe("rendering", () => {
    it("renders a div element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverBackdrop class="backdrop" />
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const backdrop = container.querySelector(".backdrop");
      expect(backdrop).not.toBeNull();
      expect(backdrop?.tagName).toBe("DIV");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverBackdrop class="custom-backdrop fixed inset-0" />
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const backdrop = container.querySelector(".custom-backdrop");
      expect(backdrop).not.toBeNull();
    });
  });

  describe("without PopoverRoot context", () => {
    it("renders a div", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<PopoverBackdrop class="standalone" />);
      root.flush();

      const backdrop = container.querySelector(".standalone");
      expect(backdrop).not.toBeNull();
    });
  });

  describe("data attributes", () => {
    it("has data-state open when popover is open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverBackdrop class="backdrop" />
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const backdrop = container.querySelector(".backdrop");
      expect(backdrop?.getAttribute("data-state")).toBe("open");
    });
  });

  describe("click behavior", () => {
    it("closes popover when clicked", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <PopoverBackdrop class="backdrop" />
            <span class="content">Content</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      expect(container.querySelector(".content")).not.toBeNull();

      const backdrop = container.querySelector(".backdrop") as HTMLElement;
      backdrop?.click();
      root.flush();

      expect(container.querySelector(".content")).toBeNull();
    });

    it("triggers onOpenChange callback when closing", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      let openState: boolean | undefined;

      root.render(
        <PopoverRoot
          setup={{
            defaultOpen: true,
            onOpenChange: (open) => {
              openState = open;
            },
          }}
        >
          <PopoverPortal>
            <PopoverBackdrop class="backdrop" />
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const backdrop = container.querySelector(".backdrop") as HTMLElement;
      backdrop?.click();
      root.flush();

      expect(openState).toBe(false);
    });
  });

  describe("styling", () => {
    it("has user-select none style", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverBackdrop class="backdrop" />
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const backdrop = container.querySelector(".backdrop") as HTMLElement;
      expect(backdrop?.style.userSelect).toBe("none");
    });
  });
});
