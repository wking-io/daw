import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { PopoverTrigger } from "./PopoverTrigger";
import { PopoverRoot } from "../root/PopoverRoot";

describe("PopoverTrigger", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Click me</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe("Click me");
    });

    it("renders as a button element", () => {
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
      expect(button?.type).toBe("button");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger class="custom-trigger">Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector(".custom-trigger");
      expect(button).not.toBeNull();
    });
  });

  describe("without PopoverRoot context", () => {
    it("renders a button", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<PopoverTrigger>Standalone</PopoverTrigger>);
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe("Standalone");
    });
  });

  describe("aria attributes", () => {
    it("has aria-haspopup dialog", () => {
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

    it("has aria-expanded true when open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-expanded")).toBe("true");
    });

    it("has aria-controls referencing popover id", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      const ariaControls = button?.getAttribute("aria-controls");
      expect(ariaControls).toBeTruthy();
      expect(ariaControls?.startsWith("popover-")).toBe(true);
    });
  });

  describe("data attributes", () => {
    it("has data-state closed when closed", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("data-state")).toBe("closed");
    });

    it("has data-state open when open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("data-state")).toBe("open");
    });
  });

  describe("click behavior", () => {
    it("opens popover on click", () => {
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

    it("closes popover on second click", () => {
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
      expect(button?.getAttribute("data-state")).toBe("closed");
    });

    it("toggles multiple times", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");

      // Open
      button?.click();
      root.flush();
      expect(button?.getAttribute("aria-expanded")).toBe("true");

      // Close
      button?.click();
      root.flush();
      expect(button?.getAttribute("aria-expanded")).toBe("false");

      // Open again
      button?.click();
      root.flush();
      expect(button?.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("callback integration", () => {
    it("triggers onOpenChange when toggling", () => {
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

      button?.click();
      root.flush();

      expect(openState).toBe(false);
    });
  });
});
