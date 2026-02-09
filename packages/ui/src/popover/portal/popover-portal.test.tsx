import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { PopoverPortal } from "./popover-portal";
import { PopoverRoot } from "../root/popover-root";
import { PopoverTrigger } from "../trigger/popover-trigger";

describe("PopoverPortal", () => {
  describe("rendering", () => {
    it("does not render children when closed", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <span class="portal-content">Content</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector(".portal-content");
      expect(content).toBeNull();
    });

    it("renders children when open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <span class="portal-content">Content</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const content = container.querySelector(".portal-content");
      expect(content).not.toBeNull();
      expect(content?.textContent).toBe("Content");
    });
  });

  describe("without PopoverRoot context", () => {
    it("renders nothing", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverPortal>
          <span class="should-not-render">Content</span>
        </PopoverPortal>,
      );
      root.flush();

      const content = container.querySelector(".should-not-render");
      expect(content).toBeNull();
    });
  });

  describe("open/close behavior", () => {
    it("shows content when trigger is clicked", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <span class="portal-content">Content</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      expect(container.querySelector(".portal-content")).toBeNull();

      const button = container.querySelector("button");
      button?.click();
      root.flush();

      expect(container.querySelector(".portal-content")).not.toBeNull();
    });

    it("hides content when trigger is clicked again", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{}}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <span class="portal-content">Content</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      const button = container.querySelector("button");
      button?.click();
      root.flush();

      expect(container.querySelector(".portal-content")).not.toBeNull();

      button?.click();
      root.flush();

      expect(container.querySelector(".portal-content")).toBeNull();
    });
  });

  describe("multiple children", () => {
    it("renders all children when open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <PopoverRoot setup={{ defaultOpen: true }}>
          <PopoverPortal>
            <span class="child-1">First</span>
            <span class="child-2">Second</span>
            <span class="child-3">Third</span>
          </PopoverPortal>
        </PopoverRoot>,
      );
      root.flush();

      expect(container.querySelector(".child-1")).not.toBeNull();
      expect(container.querySelector(".child-2")).not.toBeNull();
      expect(container.querySelector(".child-3")).not.toBeNull();
    });
  });
});
