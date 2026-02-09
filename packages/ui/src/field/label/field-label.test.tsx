import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { FieldLabel } from "./field-label";
import { FieldRoot } from "../root/field-root";
import { FieldControl } from "../control/field-control";

describe("FieldLabel", () => {
  describe("rendering", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldLabel>Username</FieldLabel>
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      expect(label).not.toBeNull();
      expect(label?.textContent).toBe("Username");
    });

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldLabel class="custom-label">Email</FieldLabel>
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      expect(label?.classList.contains("custom-label")).toBe(true);
    });

    it("renders as a label element with htmlFor", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldLabel>Password</FieldLabel>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      expect(label).not.toBeNull();
      expect(label?.htmlFor).toBeTruthy();
    });

    it("has an id attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldLabel>Label</FieldLabel>
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      expect(label?.id).toBeTruthy();
      expect(label?.id?.startsWith("field-label-")).toBe(true);
    });
  });

  describe("without FieldRoot context", () => {
    it("renders as span with role none", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<FieldLabel>Standalone</FieldLabel>);
      root.flush();

      const span = container.querySelector("span");
      expect(span).not.toBeNull();
      expect(span?.getAttribute("role")).toBe("none");
      expect(span?.textContent).toBe("Standalone");
    });

    it("applies custom class when standalone", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<FieldLabel class="standalone-class">Label</FieldLabel>);
      root.flush();

      const span = container.querySelector("span");
      expect(span?.classList.contains("standalone-class")).toBe(true);
    });
  });

  describe("control association", () => {
    it("htmlFor matches control id", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldLabel>Email</FieldLabel>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      const input = container.querySelector("input");
      expect(label?.htmlFor).toBe(input?.id ?? "");
    });

    it("works when label comes after control", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldLabel>Email</FieldLabel>
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      const input = container.querySelector("input");
      expect(label?.htmlFor).toBe(input?.id ?? "");
    });
  });

  describe("data attributes", () => {
    it("has data-disabled when field is disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ disabled: true }}>
          <FieldLabel>Disabled Field</FieldLabel>
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      expect(label?.hasAttribute("data-disabled")).toBe(true);
    });

    it("does not have data-disabled when field is enabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ disabled: false }}>
          <FieldLabel>Enabled Field</FieldLabel>
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      expect(label?.hasAttribute("data-disabled")).toBe(false);
    });

    it("has data-invalid when field is externally invalid", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldLabel>Invalid Field</FieldLabel>
        </FieldRoot>,
      );
      root.flush();

      const label = container.querySelector("label");
      expect(label?.hasAttribute("data-invalid")).toBe(true);
    });
  });

  describe("multiple labels", () => {
    it("supports multiple labels in same field", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldLabel>Primary Label</FieldLabel>
          <FieldLabel>Secondary Label</FieldLabel>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const labels = container.querySelectorAll("label");
      expect(labels.length).toBe(2);
    });
  });
});
