import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { Popover } from "../ui/popover";

describe("Popover", () => {
  describe("Root", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Popover.Root setup={{}}>
          <span class="test-child">Content</span>
        </Popover.Root>,
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
        <Popover.Root setup={{}}>
          <Popover.Trigger>Open</Popover.Trigger>
        </Popover.Root>,
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
        <Popover.Root setup={{}}>
          <Popover.Trigger>Open</Popover.Trigger>
        </Popover.Root>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-haspopup")).toBe("dialog");
    });

    it("has aria-expanded false when closed", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Popover.Root setup={{}}>
          <Popover.Trigger>Open</Popover.Trigger>
        </Popover.Root>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("aria-expanded")).toBe("false");
    });

    it("has data-state closed when closed", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Popover.Root setup={{}}>
          <Popover.Trigger>Open</Popover.Trigger>
        </Popover.Root>,
      );
      root.flush();

      const button = container.querySelector("[data-state='closed']");
      expect(button).not.toBeNull();
    });

    it("toggles popover open on click", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Popover.Root setup={{}}>
          <Popover.Trigger>Open</Popover.Trigger>
        </Popover.Root>,
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
        <Popover.Root setup={{}}>
          <Popover.Trigger>Open</Popover.Trigger>
        </Popover.Root>,
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
        <Popover.Root setup={{}}>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Portal>
            <span class="portal-content">Portal Content</span>
          </Popover.Portal>
        </Popover.Root>,
      );
      root.flush();

      const portalContent = container.querySelector(".portal-content");
      expect(portalContent).toBeNull();
    });

    it("renders children when open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Popover.Root setup={{ defaultOpen: true }}>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Portal>
            <span class="portal-content">Portal Content</span>
          </Popover.Portal>
        </Popover.Root>,
      );
      root.flush();

      const portalContent = container.querySelector(".portal-content");
      expect(portalContent).not.toBeNull();
    });
  });

  describe("integration", () => {
    it("full popover flow works correctly", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Popover.Root setup={{}}>
          <Popover.Trigger>Menu</Popover.Trigger>
          <Popover.Portal>
            <Popover.Backdrop class="backdrop" />
            <Popover.Close class="close">Close</Popover.Close>
          </Popover.Portal>
        </Popover.Root>,
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
