import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { PopoverClose } from "./popover-close";
import { PopoverRoot } from "../root/popover-root";
import { PopoverTrigger } from "../trigger/popover-trigger";
import { PopoverPortal } from "../portal/popover-portal";

describe("PopoverClose", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverClose>Close</PopoverClose>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe("Close");
    });

    it("renders as a button element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverClose>×</PopoverClose>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.type).toBe("button");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverClose class="custom-close">Close</PopoverClose>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector(".custom-close");
      expect(button).not.toBeNull();
    });
  });

  describe("without PopoverRoot context", () => {
    it("renders a button", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<PopoverClose class="standalone">Close</PopoverClose>);
      root.flush();

      const button = container.querySelector(".standalone");
      expect(button).not.toBeNull();
    });
  });

  describe("data attributes", () => {
    it("has data-state open when popover is open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverClose class="close-btn">Close</PopoverClose>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector(".close-btn");
      expect(button?.getAttribute("data-state")).toBe("open");
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
            <PopoverClose class="close-btn">Close</PopoverClose>
            <span class="content">Content</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      expect(container.querySelector(".content")).not.toBeNull();

      const closeBtn = container.querySelector(".close-btn") as HTMLElement;
      closeBtn?.click();
      root.flush();

      expect(container.querySelector(".content")).toBeNull();
    });

    it("triggers onOpenChange callback", () => {
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
            <PopoverClose class="close-btn">Close</PopoverClose>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const closeBtn = container.querySelector(".close-btn") as HTMLElement;
      closeBtn?.click();
      root.flush();

      expect(openState).toBe(false);
    });

    it("updates trigger aria-expanded", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <PopoverClose class="close-btn">Close</PopoverClose>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button:not(.close-btn)");
      expect(trigger?.getAttribute("aria-expanded")).toBe("true");

      const closeBtn = container.querySelector(".close-btn") as HTMLElement;
      closeBtn?.click();
      root.flush();

      expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("rich content", () => {
    it("supports nested elements", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverClose class="close-btn">
              <span class="icon">×</span>
              <span class="text">Close</span>
            </PopoverClose>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      expect(container.querySelector(".icon")).not.toBeNull();
      expect(container.querySelector(".text")).not.toBeNull();
    });
  });
});
