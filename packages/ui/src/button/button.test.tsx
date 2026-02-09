import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { Button } from "./button";

describe("Button", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button>Click me</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe("Click me");
    });

    it("renders a button element directly (headless)", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button>Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.parentElement).toBe(container);
    });

    it("sets type to button by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button>Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("type")).toBe("button");
    });

    it("sets the type to submit when type is submit", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button type="submit">Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button?.getAttribute("type")).toBe("submit");
    });
  });
  describe("disabled state", () => {
    it("is not disabled by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button>Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button?.disabled).toBe(false);
    });

    it("can be disabled via props", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<Button disabled>Test</Button>);
      root.flush();

      const button = container.querySelector("button");
      expect(button?.disabled).toBe(true);
    });
  });

  describe("button props", () => {
    it("passes through button props", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <Button type="submit" name="test-button">
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
          disabled
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
