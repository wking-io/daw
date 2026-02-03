import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { Button } from "./Button";
import { ButtonDataAttributes } from "./ButtonDataAttributes";

describe("Button", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button setup={{}}>Click me</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe("Click me");
    });

    it("renders a button element directly (headless)", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button setup={{}}>Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.parentElement).toBe(container);
    });

    it("applies custom class to the button", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Button setup={{}} class="custom-class">
          Test
        </Button>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.classList.contains("custom-class")).toBe(true);
    });

    it("sets type to button by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button setup={{}}>Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("type")).toBe("button");
    });
  });

  describe("disabled state", () => {
    it("is not disabled by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button setup={{}}>Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button?.disabled).toBe(false);
      expect(button?.hasAttribute(ButtonDataAttributes.disabled)).toBe(false);
    });

    it("can be disabled via setup", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button setup={{ disabled: true }}>Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button?.disabled).toBe(true);
      expect(button?.hasAttribute(ButtonDataAttributes.disabled)).toBe(true);
    });

    it("can be disabled via props", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Button setup={{}} disabled>
          Test
        </Button>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.disabled).toBe(true);
      expect(button?.hasAttribute(ButtonDataAttributes.disabled)).toBe(true);
    });

    it("props disabled overrides setup disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Button setup={{ disabled: true }} disabled={false}>
          Test
        </Button>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.disabled).toBe(false);
      expect(button?.hasAttribute(ButtonDataAttributes.disabled)).toBe(false);
    });
  });

  describe("button props", () => {
    it("passes through button props", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Button setup={{}} type="submit" name="test-button">
          Test
        </Button>,
      );
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("type")).toBe("submit");
      expect(button?.getAttribute("name")).toBe("test-button");
    });
  });

  describe("event handling", () => {
    it("handles click events", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      let clicked = false;

      root.render(
        <Button
          setup={{}}
          on={{
            click: () => {
              clicked = true;
            },
          }}
        >
          Test
        </Button>,
      );
      root.flush();

      const button = container.querySelector("button");
      button?.click();

      expect(clicked).toBe(true);
    });

    it("does not fire click when disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      let clicked = false;

      root.render(
        <Button
          setup={{ disabled: true }}
          on={{
            click: () => {
              clicked = true;
            },
          }}
        >
          Test
        </Button>,
      );
      root.flush();

      const button = container.querySelector("button");
      button?.click();

      expect(clicked).toBe(false);
    });
  });
});
