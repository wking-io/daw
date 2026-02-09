import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { TabsPanel } from "./tabs-panel";
import { TabsRoot } from "../root/tabs-root";
import { TabsList } from "../list/tabs-list";
import { TabsTab } from "../tab/tabs-tab";

describe("TabsPanel", () => {
  describe("rendering", () => {
    it("renders children when active", () => {
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

    it("renders a div element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>Content</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.tagName).toBe("DIV");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }} class="custom-panel">
            Content
          </TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector(".custom-panel");
      expect(panel).not.toBeNull();
    });

    it("has an id attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>Content</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.id).toBeTruthy();
      expect(panel?.id?.startsWith("tabpanel-")).toBe(true);
    });
  });

  describe("without TabsRoot context", () => {
    it("renders a div with tabpanel role", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<TabsPanel setup={{ value: "standalone" }}>Standalone</TabsPanel>);
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel).not.toBeNull();
    });
  });

  describe("aria attributes", () => {
    it("has role tabpanel", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>Content</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel).not.toBeNull();
    });

    it("has aria-labelledby referencing tab id", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
          <TabsPanel setup={{ value: "tab1" }}>Panel 1</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.getAttribute("aria-labelledby")).toBe(tab?.id ?? "");
    });
  });

  describe("data attributes", () => {
    it("has data-orientation matching context", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1", orientation: "vertical" }}>
          <TabsPanel setup={{ value: "tab1" }}>Content</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.getAttribute("data-orientation")).toBe("vertical");
    });

    it("has data-hidden when inactive and keepMounted", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>Panel 1</TabsPanel>
          <TabsPanel setup={{ value: "tab2", keepMounted: true }}>Panel 2</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panels = container.querySelectorAll("[role='tabpanel']");
      expect(panels[1]?.hasAttribute("data-hidden")).toBe(true);
    });

    it("does not have data-hidden when active", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>Content</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.hasAttribute("data-hidden")).toBe(false);
    });
  });

  describe("visibility behavior", () => {
    it("does not render inactive panel by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>Panel 1</TabsPanel>
          <TabsPanel setup={{ value: "tab2" }}>Panel 2</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panels = container.querySelectorAll("[role='tabpanel']");
      expect(panels.length).toBe(1);
      expect(panels[0]?.textContent).toBe("Panel 1");
    });

    it("renders inactive panel when keepMounted is true", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1", keepMounted: true }}>Panel 1</TabsPanel>
          <TabsPanel setup={{ value: "tab2", keepMounted: true }}>Panel 2</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panels = container.querySelectorAll("[role='tabpanel']");
      expect(panels.length).toBe(2);
    });

    it("has hidden attribute when inactive and keepMounted", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>Panel 1</TabsPanel>
          <TabsPanel setup={{ value: "tab2", keepMounted: true }}>Panel 2</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panels = container.querySelectorAll("[role='tabpanel']");
      expect(panels[1]?.hasAttribute("hidden")).toBe(true);
    });

    it("does not have hidden attribute when active", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>Panel 1</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.hasAttribute("hidden")).toBe(false);
    });
  });

  describe("tab switching", () => {
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

      expect(container.querySelector("[role='tabpanel']")?.textContent).toBe("Panel 1");

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[1] as HTMLButtonElement)?.click();
      root.flush();

      expect(container.querySelector("[role='tabpanel']")?.textContent).toBe("Panel 2");
    });

    it("unmounts old panel and mounts new panel when not keepMounted", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
          <TabsPanel setup={{ value: "tab1" }}>
            <span class="panel-1">Panel 1</span>
          </TabsPanel>
          <TabsPanel setup={{ value: "tab2" }}>
            <span class="panel-2">Panel 2</span>
          </TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      expect(container.querySelector(".panel-1")).not.toBeNull();
      expect(container.querySelector(".panel-2")).toBeNull();

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[1] as HTMLButtonElement)?.click();
      root.flush();

      expect(container.querySelector(".panel-1")).toBeNull();
      expect(container.querySelector(".panel-2")).not.toBeNull();
    });

    it("keeps both panels mounted when keepMounted is true", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
            <TabsTab setup={{ value: "tab2" }}>Tab 2</TabsTab>
          </TabsList>
          <TabsPanel setup={{ value: "tab1", keepMounted: true }}>
            <span class="panel-1">Panel 1</span>
          </TabsPanel>
          <TabsPanel setup={{ value: "tab2", keepMounted: true }}>
            <span class="panel-2">Panel 2</span>
          </TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[1] as HTMLButtonElement)?.click();
      root.flush();

      expect(container.querySelector(".panel-1")).not.toBeNull();
      expect(container.querySelector(".panel-2")).not.toBeNull();
    });
  });

  describe("rich content", () => {
    it("supports nested elements", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsPanel setup={{ value: "tab1" }}>
            <h2 class="title">Title</h2>
            <p class="body">Body text</p>
            <button class="action">Action</button>
          </TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      expect(container.querySelector(".title")).not.toBeNull();
      expect(container.querySelector(".body")).not.toBeNull();
      expect(container.querySelector(".action")).not.toBeNull();
    });
  });

  describe("value types", () => {
    it("supports string values", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "string-panel" }}>
          <TabsPanel setup={{ value: "string-panel" }}>String Panel</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.textContent).toBe("String Panel");
    });

    it("supports number values", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: 42 }}>
          <TabsPanel setup={{ value: 42 }}>Number Panel</TabsPanel>
        </TabsRoot>,
      );
      root.flush();

      const panel = container.querySelector("[role='tabpanel']");
      expect(panel?.textContent).toBe("Number Panel");
    });
  });
});
