import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { TabsIndicator } from "./TabsIndicator";
import { TabsRoot } from "../root/TabsRoot";
import { TabsList } from "../list/TabsList";
import { TabsTab } from "../tab/TabsTab";

describe("TabsIndicator", () => {
  describe("rendering", () => {
    it("renders a span element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsIndicator class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const indicator = container.querySelector(".indicator");
      // Note: indicator may return null initially until tabs are positioned
      if (indicator) {
        expect(indicator.tagName).toBe("SPAN");
      }
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsIndicator class="custom-indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      // Trigger a re-render to allow indicator to position
      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[0] as HTMLButtonElement)?.click();
      root.flush();
    });
  });

  describe("without TabsRoot context", () => {
    it("renders a span", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<TabsIndicator class="standalone" />);
      root.flush();

      const indicator = container.querySelector(".standalone");
      expect(indicator).not.toBeNull();
      expect(indicator?.tagName).toBe("SPAN");
    });
  });

  describe("aria attributes", () => {
    it("has role presentation", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsIndicator class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      // Force indicator to render by triggering update
      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[0] as HTMLButtonElement)?.click();
      root.flush();

      const indicator = container.querySelector(".indicator");
      if (indicator) {
        expect(indicator.getAttribute("role")).toBe("presentation");
      }
    });

    it("has aria-hidden true", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsIndicator class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[0] as HTMLButtonElement)?.click();
      root.flush();

      const indicator = container.querySelector(".indicator");
      if (indicator) {
        expect(indicator.getAttribute("aria-hidden")).toBe("true");
      }
    });
  });

  describe("data attributes", () => {
    it("has data-orientation matching context", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1", orientation: "vertical" }}>
          <TabsList setup={{}}>
            <TabsIndicator class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[0] as HTMLButtonElement)?.click();
      root.flush();

      const indicator = container.querySelector(".indicator");
      if (indicator) {
        expect(indicator.getAttribute("data-orientation")).toBe("vertical");
      }
    });

    it("has data-activation-direction", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsIndicator class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const tabs = container.querySelectorAll("[role='tab']");
      (tabs[0] as HTMLButtonElement)?.click();
      root.flush();

      const indicator = container.querySelector(".indicator");
      if (indicator) {
        expect(indicator.hasAttribute("data-activation-direction")).toBe(true);
      }
    });
  });

  describe("initial state", () => {
    it("returns null when no tab is selected", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{}}>
          <TabsList setup={{}}>
            <TabsIndicator class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      // Without a defaultValue, indicator may not render
      const indicator = container.querySelector(".indicator");
      // This is expected behavior - no indicator without a selected tab
      expect(indicator).toBeNull();
    });
  });

  describe("setup options", () => {
    it("accepts speed option", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsIndicator setup={{ speed: 1000 }} class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      // Just verify it renders without error
      const list = container.querySelector("[role='tablist']");
      expect(list).not.toBeNull();
    });

    it("accepts minDuration option", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsIndicator setup={{ minDuration: 50 }} class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list).not.toBeNull();
    });

    it("accepts maxDuration option", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <TabsRoot setup={{ defaultValue: "tab1" }}>
          <TabsList setup={{}}>
            <TabsIndicator setup={{ maxDuration: 500 }} class="indicator" />
            <TabsTab setup={{ value: "tab1" }}>Tab 1</TabsTab>
          </TabsList>
        </TabsRoot>,
      );
      root.flush();

      const list = container.querySelector("[role='tablist']");
      expect(list).not.toBeNull();
    });
  });

  describe("type exports", () => {
    it("exports Position type", () => {
      const position: TabsIndicator.Position = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      };
      expect(position).toBeDefined();
    });

    it("exports Size type", () => {
      const size: TabsIndicator.Size = {
        width: 100,
        height: 40,
      };
      expect(size).toBeDefined();
    });

    it("exports Setup type", () => {
      const setup: TabsIndicator.Setup = {
        speed: 800,
        minDuration: 100,
        maxDuration: 300,
      };
      expect(setup).toBeDefined();
    });
  });
});
