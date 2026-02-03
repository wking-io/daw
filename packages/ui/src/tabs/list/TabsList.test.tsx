import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { TabsList } from "./TabsList";
import { TabsRoot } from "../root/TabsRoot";
import { TabsTab } from "../tab/TabsTab";

describe("TabsList", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <span class="child">Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const child = container.querySelector(".child");
      expect(child).not.toBeNull();
      expect(child?.textContent).toBe("Content");
    });

    it("renders a div element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <span>Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list?.tagName).toBe("DIV");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}} class="custom-list">
            <span>Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector(".custom-list");
      expect(list).not.toBeNull();
    });
  });

  describe("without TabsRoot context", () => {
    it("renders with tablist role", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsList setup={{}}>
          <span>Standalone</span>
        </TabsList>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list).not.toBeNull();
    });
  });

  describe("aria attributes", () => {
    it("has role tablist", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <span>Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list).not.toBeNull();
    });

    it("has aria-orientation horizontal by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <span>Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list?.getAttribute("aria-orientation")).toBe("horizontal");
    });

    it("has aria-orientation vertical when context is vertical", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ orientation: "vertical" }}>
          <TabsList setup={{}}>
            <span>Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list?.getAttribute("aria-orientation")).toBe("vertical");
    });
  });

  describe("data attributes", () => {
    it("has data-orientation horizontal", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ orientation: "horizontal" }}>
          <TabsList setup={{}}>
            <span>Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list?.getAttribute("data-orientation")).toBe("horizontal");
    });

    it("has data-orientation vertical", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ orientation: "vertical" }}>
          <TabsList setup={{}}>
            <span>Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list?.getAttribute("data-orientation")).toBe("vertical");
    });

    it("has data-activation-direction", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <span>Content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list?.hasAttribute("data-activation-direction")).toBe(true);
    });
  });

  describe("keyboard navigation", () => {
    it("navigates to next tab with ArrowRight in horizontal mode", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    });

    it("navigates to previous tab with ArrowLeft in horizontal mode", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab2" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    });

    it("navigates to next tab with ArrowDown in vertical mode", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1", orientation: "vertical" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    });

    it("navigates to previous tab with ArrowUp in vertical mode", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab2", orientation: "vertical" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    });

    it("navigates to first tab with Home", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab3" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
            <TabsTab setup={{ value: "tab3" }}>Tab 3</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "Home", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    });

    it("navigates to last tab with End", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
            <TabsTab setup={{ value: "tab3" }}>Tab 3</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "End", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[2]?.getAttribute("aria-selected")).toBe("true");
    });

    it("loops to last tab when at first and pressing ArrowLeft", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{ loop: true }}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    });

    it("loops to first tab when at last and pressing ArrowRight", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab2" }}>
          <TabsList setup={{ loop: true }}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    });

    it("skips disabled tabs during navigation", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2", disabled: true }}>Tab 2</TabsTab>
            <TabsTab setup={{ value: "tab3" }}>Tab 3</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
      list?.dispatchEvent(event);
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[2]?.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("activateOnFocus option", () => {
    it("activates tab on focus by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      tabs[1]?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();

      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    });

    it("does not activate tab on focus when activateOnFocus is false", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{ activateOnFocus: false }}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      tabs[1]?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();

      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    });
  });
});
