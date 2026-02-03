import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { FieldRoot } from "./FieldRoot";
import { FieldLabel } from "../label/FieldLabel";
import { FieldControl } from "../control/FieldControl";
import { FieldDescription } from "../description/FieldDescription";
import { FieldError } from "../error/FieldError";

describe("FieldRoot", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <span class="test-child">Content</span>
        </FieldRoot>,
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
        <FieldRoot setup={{}} class="custom-field">
          <span>Content</span>
        </FieldRoot>,
      );
      root.flush();

      const el = container.querySelector(".custom-field");
      expect(el).not.toBeNull();
    });
  });

  describe("disabled state", () => {
    it("sets data-disabled when disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ disabled: true }}>
          <span>Content</span>
        </FieldRoot>,
      );
      root.flush();

      const el = container.querySelector("[data-disabled]");
      expect(el).not.toBeNull();
    });

    it("does not set data-disabled by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <span>Content</span>
        </FieldRoot>,
      );
      root.flush();

      const el = container.querySelector("[data-disabled]");
      expect(el).toBeNull();
    });
  });

  describe("Label integration", () => {
    it("renders label element with htmlFor", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldLabel>Username</FieldLabel>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      expect(label).not.toBeNull();
      expect(label?.textContent).toBe("Username");
      expect(label?.htmlFor).toBeTruthy();
    });

    it("label htmlFor matches control id", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldLabel>Username</FieldLabel>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      const input = container.querySelector("input");
      expect(label?.htmlFor).toBe(input?.id ?? "");
    });
  });

  describe("Control integration", () => {
    it("renders input element", () => {
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

  describe("Description integration", () => {
    it("renders description text", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>Enter your username</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      expect(desc).not.toBeNull();
      expect(desc?.textContent).toBe("Enter your username");
    });

    it("has an id on the description element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldDescription>Help text</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.id).toBeTruthy();
      expect(desc?.id?.startsWith("field-description-")).toBe(true);
    });
  });

  describe("Error integration", () => {
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
  });

  describe("complete field integration", () => {
    it("renders complete field with all parts", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ name: "email" }}>
          <FieldLabel>Email</FieldLabel>
          <FieldControl type="email" placeholder="Enter email" />
          <FieldDescription>We'll never share your email</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      expect(container.querySelector("label")).not.toBeNull();
      expect(container.querySelector("input")).not.toBeNull();
      expect(container.querySelector("p")).not.toBeNull();

      const input = container.querySelector("input");
      expect(input?.type).toBe("email");
      expect(input?.placeholder).toBe("Enter email");
      expect(input?.name).toBe("email");
    });
  });
});
