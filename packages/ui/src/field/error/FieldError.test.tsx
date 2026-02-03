import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { FieldError } from "./FieldError";
import { FieldRoot } from "../root/FieldRoot";
import { FieldControl } from "../control/FieldControl";

describe("FieldError", () => {
  describe("rendering", () => {
    it("does not render when field is valid", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldError>Error message</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error).toBeNull();
    });

    it("renders when forceShow is true", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldError forceShow>Forced error</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error).not.toBeNull();
      expect(error?.textContent).toBe("Forced error");
    });

    it("renders children when shown", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldError forceShow>Custom error message</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error?.textContent).toBe("Custom error message");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldError forceShow class="custom-error">
            Error
          </FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error?.classList.contains("custom-error")).toBe(true);
    });

    it("renders a div with role alert", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldError forceShow>Error</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("div[role='alert']");
      expect(error).not.toBeNull();
    });

    it("has an id attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldError forceShow>Error</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error?.id).toBeTruthy();
      expect(error?.id?.startsWith("field-error-")).toBe(true);
    });
  });

  describe("without FieldRoot context", () => {
    it("renders nothing", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<FieldError>Standalone error</FieldError>);
      root.flush();

      expect(container.innerHTML).toBe("");
    });
  });

  describe("match prop", () => {
    it("shows when match is true", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldError match={true}>Always shown</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error).not.toBeNull();
    });

    it("hides when match is false", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldControl />
          <FieldError match={false}>Never shown</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error).toBeNull();
    });

    it("shows when match is customError and customError is true", async () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      const validate = () => "Custom error";

      root.render(
        <FieldRoot setup={{ validate }}>
          <FieldControl />
          <FieldError match="customError">Custom error shown</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();
      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 10));
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error).not.toBeNull();
    });
  });

  describe("invalid state", () => {
    it("renders when field is externally marked invalid", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldControl />
          <FieldError>Invalid field</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const dataInvalid = container.querySelector("[data-invalid]");
      expect(dataInvalid).not.toBeNull();
    });

    it("shows default error when validation fails", async () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      const validate = () => "Field is required";

      root.render(
        <FieldRoot setup={{ validate }}>
          <FieldControl />
          <FieldError />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();
      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 10));
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error).not.toBeNull();
      expect(error?.textContent).toBe("Field is required");
    });
  });

  describe("validation errors", () => {
    it("displays single error as text", async () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      const validate = () => "Single error message";

      root.render(
        <FieldRoot setup={{ validate }}>
          <FieldControl />
          <FieldError />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();
      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      await new Promise((resolve) => setTimeout(resolve, 10));
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error?.textContent).toBe("Single error message");
    });

    it("displays multiple errors as a list", async () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      const validate = () => ["Error one", "Error two"];

      root.render(
        <FieldRoot setup={{ validate }}>
          <FieldControl />
          <FieldError />
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();
      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      await new Promise((resolve) => setTimeout(resolve, 10));
      root.flush();

      const error = container.querySelector("[role='alert']");
      const list = error?.querySelector("ul");
      expect(list).not.toBeNull();

      const items = error?.querySelectorAll("li");
      expect(items?.length).toBe(2);
      expect(items?.[0]?.textContent).toBe("Error one");
      expect(items?.[1]?.textContent).toBe("Error two");
    });

    it("prefers custom children over validation errors", async () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      const validate = () => "Validation error";

      root.render(
        <FieldRoot setup={{ validate }}>
          <FieldControl />
          <FieldError>Custom error text</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();
      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      await new Promise((resolve) => setTimeout(resolve, 10));
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error?.textContent).toBe("Custom error text");
    });
  });

  describe("control association", () => {
    it("is referenced by control aria-describedby", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldError forceShow>Error</FieldError>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      const input = container.querySelector("input");
      const describedBy = input?.getAttribute("aria-describedby") ?? "";
      const errorId = error?.id ?? "";
      expect(describedBy.includes(errorId)).toBe(true);
    });
  });

  describe("data attributes", () => {
    it("has data-disabled when field is disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ disabled: true }}>
          <FieldError forceShow>Disabled error</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error?.hasAttribute("data-disabled")).toBe(true);
    });

    it("has data-invalid when field is invalid", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldError forceShow>Error</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error?.hasAttribute("data-invalid")).toBe(true);
    });

    it("has data-touched after field is touched", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldError forceShow>Error</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();
      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      const error = container.querySelector("[role='alert']");
      expect(error?.hasAttribute("data-touched")).toBe(true);
    });
  });

  describe("multiple errors", () => {
    it("supports multiple error components in same field", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldError forceShow>First error</FieldError>
          <FieldError forceShow>Second error</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const errors = container.querySelectorAll("[role='alert']");
      expect(errors.length).toBe(2);
    });

    it("each error has a unique id", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldError forceShow>First</FieldError>
          <FieldError forceShow>Second</FieldError>
        </FieldRoot>,
      );
      root.flush();

      const errors = container.querySelectorAll("[role='alert']");
      const ids = Array.from(errors).map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("all errors are referenced by aria-describedby", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldError forceShow>First</FieldError>
          <FieldError forceShow>Second</FieldError>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const errors = container.querySelectorAll("[role='alert']");
      const input = container.querySelector("input");
      const describedBy = input?.getAttribute("aria-describedby") ?? "";

      errors.forEach((error) => {
        expect(describedBy.includes(error.id)).toBe(true);
      });
    });
  });

  describe("rich content", () => {
    it("supports nested elements in error message", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldError forceShow>
            <span class="icon">!</span> Error occurred
          </FieldError>
        </FieldRoot>,
      );
      root.flush();

      const icon = container.querySelector(".icon");
      expect(icon).not.toBeNull();
      expect(icon?.textContent).toBe("!");
    });
  });
});
