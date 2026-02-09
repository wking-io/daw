import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { FieldControl } from "./field-control";
import { FieldRoot } from "../root/field-root";
import { FieldDescription } from "../description/field-description";
import { FieldError } from "../error/field-error";

describe("FieldControl", () => {
  describe("rendering", () => {
    it("renders an input element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input).not.toBeNull();
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl class="custom-input" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.classList.contains("custom-input")).toBe(true);
    });

    it("has an id attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.id).toBeTruthy();
      expect(input?.id?.startsWith("field-control-")).toBe(true);
    });
  });

  describe("without FieldRoot context", () => {
    it("renders a simple input", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<FieldControl />);
      root.flush();

      const input = container.querySelector("input");
      expect(input).not.toBeNull();
      expect(input?.type).toBe("text");
    });

    it("applies props when standalone", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<FieldControl class="standalone" placeholder="Enter value" />);
      root.flush();

      const input = container.querySelector("input");
      expect(input?.classList.contains("standalone")).toBe(true);
      expect(input?.placeholder).toBe("Enter value");
    });
  });

  describe("input types", () => {
    it("defaults to text type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("text");
    });

    it("renders email type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="email" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("email");
    });

    it("renders password type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="password" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("password");
    });

    it("renders number type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="number" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("number");
    });

    it("renders tel type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="tel" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("tel");
    });

    it("renders url type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="url" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("url");
    });

    it("renders search type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="search" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("search");
    });

    it("renders checkbox type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="checkbox" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("checkbox");
    });

    it("renders radio type", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="radio" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.type).toBe("radio");
    });
  });

  describe("field props", () => {
    it("sets name attribute from field", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ name: "username" }}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.name).toBe("username");
    });

    it("is disabled when field is disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ disabled: true }}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.disabled).toBe(true);
    });

    it("is not disabled by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.disabled).toBe(false);
    });
  });

  describe("input props", () => {
    it("sets placeholder", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl placeholder="Enter text" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.placeholder).toBe("Enter text");
    });

    it("sets required attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl required />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.required).toBe(true);
    });

    it("sets minLength and maxLength", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl minLength={3} maxLength={10} />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.minLength).toBe(3);
      expect(input?.maxLength).toBe(10);
    });

    it("sets min and max for number input", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl type="number" min={0} max={100} />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.min).toBe("0");
      expect(input?.max).toBe("100");
    });

    it("sets pattern attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl pattern="[A-Za-z]+" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.pattern).toBe("[A-Za-z]+");
    });

    it("sets readOnly attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl readOnly />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.readOnly).toBe(true);
    });

    it("sets autoComplete attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl autoComplete="email" />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.autocomplete).toBe("email");
    });
  });

  describe("state management", () => {
    it("sets data-touched after blur", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input).not.toBeNull();

      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();

      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      const touchedEl = container.querySelector("[data-touched]");
      expect(touchedEl).not.toBeNull();
    });

    it("sets data-focused while focused", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();

      const focusedEl = container.querySelector("[data-focused]");
      expect(focusedEl).not.toBeNull();
    });

    it("removes data-focused after blur", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();

      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      const focusedEl = container.querySelector("[data-focused]");
      expect(focusedEl).toBeNull();
    });

    it("sets data-filled when input has value", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input") as HTMLInputElement;
      expect(input).not.toBeNull();

      input.value = "test";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      root.flush();

      const filledEl = container.querySelector("[data-filled]");
      expect(filledEl).not.toBeNull();
    });

    it("removes data-filled when input is cleared", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input") as HTMLInputElement;

      input.value = "test";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      root.flush();

      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      root.flush();

      const filledEl = container.querySelector("[data-filled]");
      expect(filledEl).toBeNull();
    });

    it("sets data-dirty when value changes from initial", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input") as HTMLInputElement;
      input.value = "changed";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      root.flush();

      const dirtyEl = container.querySelector("[data-dirty]");
      expect(dirtyEl).not.toBeNull();
    });
  });

  describe("data attributes", () => {
    it("has data-disabled when field is disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ disabled: true }}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.hasAttribute("data-disabled")).toBe(true);
    });

    it("has data-invalid when field is externally invalid", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.hasAttribute("data-invalid")).toBe(true);
    });
  });

  describe("aria attributes", () => {
    it("sets aria-invalid when field is invalid", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      expect(input?.getAttribute("aria-invalid")).toBe("true");
    });

    it("has aria-describedby referencing description", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>Help text</FieldDescription>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      const description = container.querySelector("p");
      const describedBy = input?.getAttribute("aria-describedby") ?? "";
      const descId = description?.id ?? "";
      expect(describedBy.includes(descId)).toBe(true);
    });

    it("has aria-describedby referencing error", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldError forceShow>Error text</FieldError>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      const error = container.querySelector("[role='alert']");
      const describedBy = input?.getAttribute("aria-describedby") ?? "";
      const errorId = error?.id ?? "";
      expect(describedBy.includes(errorId)).toBe(true);
    });

    it("has aria-describedby referencing both description and error", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldDescription>Help text</FieldDescription>
          <FieldError forceShow>Error text</FieldError>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      const description = container.querySelector("p");
      const error = container.querySelector("[role='alert']");
      const describedBy = input?.getAttribute("aria-describedby") ?? "";
      const descId = description?.id ?? "";
      const errorId = error?.id ?? "";
      expect(describedBy.includes(descId)).toBe(true);
      expect(describedBy.includes(errorId)).toBe(true);
    });
  });

  describe("validation modes", () => {
    it("validates onBlur by default", async () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      const validate = (value: unknown) => (value === "" ? "Required" : null);

      root.render(
        <FieldRoot setup={{ validate }}>
          <FieldControl />
          <FieldError />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input") as HTMLInputElement;

      input.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();

      input.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 10));
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error).not.toBeNull();
    });

    it("validates onChange when configured", async () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      const validate = (value: unknown) => (value === "" ? "Required" : null);

      root.render(
        <FieldRoot setup={{ validationMode: "onChange", validate }}>
          <FieldControl />
          <FieldError />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input") as HTMLInputElement;

      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      root.flush();

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 10));
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error).not.toBeNull();
    });
  });
});
