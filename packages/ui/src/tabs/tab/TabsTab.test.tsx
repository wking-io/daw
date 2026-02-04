import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { TabsTab } from "./TabsTab";
import { TabsRoot } from "../root/TabsRoot";
import { TabsList } from "../list/TabsList";
import { TabsPanel } from "../panel/TabsPanel";

describe("TabsTab", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab Content</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab).not.toBeNull();
      expect(tab?.textContent).toBe("Tab Content");
    });

    it("renders as a button element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.tagName).toBe("BUTTON");
      expect((tab as HTMLButtonElement)?.type).toBe("button");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }} class="custom-tab">
              Tab
            </TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector(".custom-tab");
      expect(tab).not.toBeNull();
    });

    it("has an id attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.id).toBeTruthy();
      expect(tab?.id?.startsWith("tab-")).toBe(true);
    });
  });

  describe("without TabsRoot context", () => {
    it("renders a button with tab role", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<TabsTab setup={{ value: "standalone" }}>Standalone</TabsTab>);
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab).not.toBeNull();
      expect(tab?.tagName).toBe("BUTTON");
    });
  });

  describe("aria attributes", () => {
    it("has role tab", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab).not.toBeNull();
    });

    it("has aria-selected true when active", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.getAttribute("aria-selected")).toBe("true");
    });

    it("has aria-selected false when inactive", () => {
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
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    });

    it("has aria-controls referencing panel id", () => {
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
      expect(tab?.getAttribute("aria-controls")).toBe(panel?.id ?? "");
    });

    it("has aria-disabled when disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1", disabled: true }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("data attributes", () => {
    it("has data-active when active", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.hasAttribute("data-active")).toBe(true);
    });

    it("does not have data-active when inactive", () => {
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
      expect(tabs[1]?.hasAttribute("data-active")).toBe(false);
    });

    it("has data-disabled when disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1", disabled: true }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.hasAttribute("data-disabled")).toBe(true);
    });

    it("has data-orientation matching context", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ orientation: "vertical" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.getAttribute("data-orientation")).toBe("vertical");
    });
  });

  describe("disabled state", () => {
    it("is disabled when disabled prop is set", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1", disabled: true }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']") as HTMLButtonElement;
      expect(tab?.disabled).toBe(true);
    });

    it("is not disabled by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']") as HTMLButtonElement;
      expect(tab?.disabled).toBe(false);
    });
  });

  describe("tabIndex", () => {
    it("has tabIndex 0 when active", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']") as HTMLElement;
      expect(tab?.tabIndex).toBe(0);
    });

    it("has tabIndex -1 when inactive", () => {
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
      expect((tabs[1] as HTMLElement)?.tabIndex).toBe(-1);
    });
  });

  describe("click behavior", () => {
    it("activates tab on click", () => {
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

    it("does not activate disabled tab on click", () => {
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

    it("triggers onValueChange callback", () => {
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

  describe("keyboard behavior", () => {
    it("activates tab on Enter key", () => {
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
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      tabs[1]?.dispatchEvent(event);
      root.flush();

      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("value types", () => {
    it("supports string values", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "string-tab" }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: "string-tab" }}>String Tab</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.getAttribute("aria-selected")).toBe("true");
    });

    it("supports number values", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: 42 }}>
          <TabsList setup={{}}>
            <TabsTab setup={{ value: 42 }}>Number Tab</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tab = container.querySelector("[role='tab']");
      expect(tab?.getAttribute("aria-selected")).toBe("true");
    });
  });
});
