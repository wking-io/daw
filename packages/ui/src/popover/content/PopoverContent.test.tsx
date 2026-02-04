import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { PopoverContent } from "./PopoverContent";
import { PopoverRoot } from "../root/PopoverRoot";
import { PopoverTrigger } from "../trigger/PopoverTrigger";
import { PopoverPortal } from "../portal/PopoverPortal";

describe("PopoverContent", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent>Popover content here</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector("[role='dialog']");
      expect(content).not.toBeNull();
      expect(content?.textContent).toBe("Popover content here");
    });

    it("renders a div element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent>Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector("[role='dialog']");
      expect(content?.tagName).toBe("DIV");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent class="custom-content">Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector(".custom-content");
      expect(content).not.toBeNull();
    });
  });

  describe("without PopoverRoot context", () => {
    it("renders a div with role dialog", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<PopoverContent>Standalone content</PopoverContent>);
      root.flush();

      const content = container.querySelector("[role='dialog']");
      expect(content).not.toBeNull();
    });
  });

  describe("aria attributes", () => {
    it("has role dialog", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent>Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector("[role='dialog']");
      expect(content).not.toBeNull();
    });

    it("has aria-modal false", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent>Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector("[role='dialog']");
      expect(content?.getAttribute("aria-modal")).toBe("false");
    });

    it("has id matching popover id", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <PopoverContent>Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector("[role='dialog']");
      const trigger = container.querySelector("button");
      const ariaControls = trigger?.getAttribute("aria-controls");

      expect(content?.id).toBe(ariaControls ?? "");
    });
  });

  describe("data attributes", () => {
    it("has data-state open when popover is open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent>Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector("[role='dialog']");
      expect(content?.getAttribute("data-state")).toBe("open");
    });
  });

  describe("focus management", () => {
    it("has tabindex -1", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent>Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector("[role='dialog']") as HTMLElement;
      expect(content?.tabIndex).toBe(-1);
    });
  });

  describe("keyboard behavior", () => {
    it("closes on Escape key", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <PopoverContent class="content">Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      expect(container.querySelector(".content")).not.toBeNull();

      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      document.dispatchEvent(event);
      root.flush();

      expect(container.querySelector(".content")).toBeNull();
    });

    it("does not close on other keys", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent class="content">Content</PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      document.dispatchEvent(event);
      root.flush();

      expect(container.querySelector(".content")).not.toBeNull();
    });
  });

  describe("rich content", () => {
    it("supports nested elements", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <PopoverContent>
              <h2 class="title">Title</h2>
              <p class="body">Body text</p>
              <button class="action">Action</button>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      expect(container.querySelector(".title")).not.toBeNull();
      expect(container.querySelector(".body")).not.toBeNull();
      expect(container.querySelector(".action")).not.toBeNull();
    });
  });
});
