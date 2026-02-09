import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { TabsRoot } from "./tabs-root";
import { TabsList } from "../list/tabs-list";
import { TabsTab } from "../tab/tabs-tab";
import { TabsPanel } from "../panel/tabs-panel";

describe("TabsRoot", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <span class="test-child">Content</span>
        </TabsRoot>,
      );
      root.flush();

      const child = container.querySelector(".test-child");
      expect(child).not.toBeNull();
      expect(child?.textContent).toBe("Content");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}} class="custom-tabs">
          <span>Content</span>
        </TabsRoot>,
      );
      root.flush();

      const el = container.querySelector(".custom-tabs");
      expect(el).not.toBeNull();
    });

    it("sets data-orientation attribute for horizontal", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ orientation: "horizontal" }}>
          <span>Content</span>
        </TabsRoot>,
      );
      root.flush();

      const el = container.querySelector("[data-orientation='horizontal']");
      expect(el).not.toBeNull();
    });

    it("sets data-orientation attribute for vertical", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ orientation: "vertical" }}>
          <span>Content</span>
        </TabsRoot>,
      );
      root.flush();

      const el = container.querySelector("[data-orientation='vertical']");
      expect(el).not.toBeNull();
    });
  });

  describe("List", () => {
    it("renders with tablist role", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <span>Tab content</span>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list).not.toBeNull();
    });

    it("sets aria-orientation based on context", () => {
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

  describe("Tab", () => {
    it("renders with tab role", () => {
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
      expect(tabs.length).toBe(2);
    });

    it("sets aria-selected for active tab", () => {
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
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    });

    it("sets data-active on active tab", () => {
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

      const activeTab = container.querySelector("[data-active]");
      expect(activeTab).not.toBeNull();
      expect(activeTab?.textContent).toBe("Tab 1");
    });

    it("changes active tab on click", () => {
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
      (tabs[1] as HTMLButtonElement)?.click();
      root.flush();

      expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    });

    it("disables tab when disabled prop is set", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2", disabled: true }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const disabledTab = container.querySelector("[data-disabled]");
      expect(disabledTab).not.toBeNull();
      expect((disabledTab as HTMLButtonElement)?.disabled).toBe(true);
    });

    it("does not change to disabled tab on click", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2", disabled: true }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[1] as HTMLButtonElement)?.click();
      root.flush();

      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    });
  });

  describe("Panel", () => {
    it("renders with tabpanel role", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
          <TabsPanel setup={{ value: "tab1" }}>Panel Content</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel).not.toBeNull();
      expect(panel?.textContent).toBe("Panel Content");
    });

    it("hides inactive panels by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
          <TabsPanel setup={{ value: "tab1" }}>Panel 1</TabsPanel>
          <TabsPanel setup={{ value: "tab2" }}>Panel 2</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panels = container.querySelectorAll("[role='tabpanel']");
      expect(panels.length).toBe(1);
      expect(panels[0]?.textContent).toBe("Panel 1");
    });

    it("shows correct panel when tab changes", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
          <TabsPanel setup={{ value: "tab1" }}>Panel 1</TabsPanel>
          <TabsPanel setup={{ value: "tab2" }}>Panel 2</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[1] as HTMLButtonElement)?.click();
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.textContent).toBe("Panel 2");
    });

    it("keeps inactive panels mounted when keepMounted is true", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
          <TabsPanel setup={{ value: "tab1", keepMounted: true }}>Panel 1</TabsPanel>
          <TabsPanel setup={{ value: "tab2", keepMounted: true }}>Panel 2</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panels = container.querySelectorAll("[role='tabpanel']");
      expect(panels.length).toBe(2);

      const hiddenPanel = container.querySelector("[data-hidden]");
      expect(hiddenPanel).not.toBeNull();
      expect(hiddenPanel?.textContent).toBe("Panel 2");
    });
  });

  describe("controlled mode", () => {
    it("uses controlled value when provided", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}} value="tab2">
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    });

    it("calls onValueChange callback", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      let changedValue: string | number | undefined;

      root.render(
        <TabsRoot
          setup={{ defaultValue: "tab1" }}
          onValueChange={(v) => {
            changedValue = v;
          }}
        >
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[1] as HTMLButtonElement)?.click();
      root.flush();

      expect(changedValue).toBe("tab2");
    });
  });
});
