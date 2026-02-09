import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { PopoverRoot } from "./popover-root";
import { PopoverTrigger } from "../trigger/popover-trigger";
import { PopoverPortal } from "../portal/popover-portal";
import { PopoverBackdrop } from "../backdrop/popover-backdrop";
import { PopoverClose } from "../close/popover-close";

describe("PopoverRoot", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <span class="test-child">Content</span>
        </PopoverRoot>,
      );
      root.flush();

      const child = container.querySelector(".test-child");
      expect(child).not.toBeNull();
    });
  });

  describe("Trigger", () => {
    it("renders as button", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe("Open");
    });

    it("has aria-haspopup attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-haspopup")).toBe("dialog");
    });

    it("has aria-expanded false when closed", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-expanded")).toBe("false");
    });

    it("has data-state closed when closed", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("[data-state='closed']");
      expect(button).not.toBeNull();
    });

    it("toggles popover open on click", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      button?.click();
      root.flush();

      expect(button?.getAttribute("aria-expanded")).toBe("true");
      expect(button?.getAttribute("data-state")).toBe("open");
    });

    it("toggles popover closed on second click", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      button?.click();
      root.flush();
      button?.click();
      root.flush();

      expect(button?.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("Portal", () => {
    it("does not render children when closed", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <span class="portal-content">Portal Content</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const portalContent = container.querySelector(".portal-content");
      expect(portalContent).toBeNull();
    });

    it("renders children when open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <span class="portal-content">Portal Content</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const portalContent = container.querySelector(".portal-content");
      expect(portalContent).not.toBeNull();
    });
  });

  describe("onOpenChange callback", () => {
    it("calls onOpenChange when opening", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      let openState: boolean | undefined;

      root.render(
        <PopoverRoot
          setup={{
            onOpenChange: (open) => {
              openState = open;
            },
          }}
        >
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      button?.click();
      root.flush();

      expect(openState).toBe(true);
    });

    it("calls onOpenChange when closing", () => {
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
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      button?.click();
      root.flush();

      expect(openState).toBe(false);
    });
  });

  describe("integration", () => {
    it("full popover flow works correctly", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Menu</PopoverTrigger>
          <PopoverPortal>
            <PopoverBackdrop class="backdrop" />
            <PopoverClose class="close">Close</PopoverClose>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      expect(container.querySelector(".close")).toBeNull();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      expect(container.querySelector(".close")).not.toBeNull();

      const closeBtn = container.querySelector(".close") as HTMLElement;
      closeBtn?.click();
      root.flush();

      expect(container.querySelector(".close")).toBeNull();
    });
  });
});
