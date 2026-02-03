import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { FieldDescription } from "./FieldDescription";
import { FieldRoot } from "../root/FieldRoot";
import { FieldControl } from "../control/FieldControl";

describe("FieldDescription", () => {
  describe("rendering", () => {
    it("renders children", () => {
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

    it("applies custom class", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription class="custom-description">Help text</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.classList.contains("custom-description")).toBe(true);
    });

    it("renders a p element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>Description</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      expect(desc).not.toBeNull();
    });

    it("has an id attribute", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>Help text</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.id).toBeTruthy();
      expect(desc?.id?.startsWith("field-description-")).toBe(true);
    });
  });

  describe("without FieldRoot context", () => {
    it("renders as simple p element", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<FieldDescription>Standalone</FieldDescription>);
      root.flush();

      const desc = container.querySelector("p");
      expect(desc).not.toBeNull();
      expect(desc?.textContent).toBe("Standalone");
    });

    it("applies custom class when standalone", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<FieldDescription class="standalone-class">Help</FieldDescription>);
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.classList.contains("standalone-class")).toBe(true);
    });

    it("does not have an id when standalone", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(<FieldDescription>Standalone</FieldDescription>);
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.id).toBeFalsy();
    });
  });

  describe("control association", () => {
    it("is referenced by control aria-describedby", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>Help text</FieldDescription>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      const input = container.querySelector("input");
      const describedBy = input?.getAttribute("aria-describedby") ?? "";
      const descId = desc?.id ?? "";
      expect(describedBy.includes(descId)).toBe(true);
    });

    it("works when description comes before control", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>Help text</FieldDescription>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      const input = container.querySelector("input");
      expect(input?.getAttribute("aria-describedby")).toContain(desc?.id ?? "");
    });
  });

  describe("data attributes", () => {
    it("has data-disabled when field is disabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ disabled: true }}>
          <FieldDescription>Disabled help</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.hasAttribute("data-disabled")).toBe(true);
    });

    it("does not have data-disabled when field is enabled", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ disabled: false }}>
          <FieldDescription>Enabled help</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.hasAttribute("data-disabled")).toBe(false);
    });

    it("has data-invalid when field is externally invalid", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{ invalid: true }}>
          <FieldDescription>Help text</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.hasAttribute("data-invalid")).toBe(true);
    });

    it("has data-touched after field is touched", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldDescription>Help text</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();
      input?.dispatchEvent(new Event("blur", { bubbles: true }));
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.hasAttribute("data-touched")).toBe(true);
    });

    it("has data-filled when field has value", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldDescription>Help text</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input") as HTMLInputElement;
      input.value = "test";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.hasAttribute("data-filled")).toBe(true);
    });

    it("has data-focused when field control is focused", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldDescription>Help text</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const input = container.querySelector("input");
      input?.dispatchEvent(new Event("focus", { bubbles: true }));
      root.flush();

      const desc = container.querySelector("p");
      expect(desc?.hasAttribute("data-focused")).toBe(true);
    });
  });

  describe("multiple descriptions", () => {
    it("supports multiple descriptions in same field", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldControl />
          <FieldDescription>Primary help</FieldDescription>
          <FieldDescription>Secondary help</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const descriptions = container.querySelectorAll("p");
      expect(descriptions.length).toBe(2);
    });

    it("all descriptions are referenced by aria-describedby", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>Primary help</FieldDescription>
          <FieldDescription>Secondary help</FieldDescription>
          <FieldControl />
        </FieldRoot>,
      );
      root.flush();

      const descriptions = container.querySelectorAll("p");
      const input = container.querySelector("input");
      const describedBy = input?.getAttribute("aria-describedby") ?? "";

      descriptions.forEach((desc) => {
        expect(describedBy.includes(desc.id)).toBe(true);
      });
    });

    it("each description has a unique id", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>First</FieldDescription>
          <FieldDescription>Second</FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const descriptions = container.querySelectorAll("p");
      const ids = Array.from(descriptions).map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("rich content", () => {
    it("supports nested elements", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <FieldRoot setup={{}}>
          <FieldDescription>
            <span class="highlight">Important:</span> Enter your email
          </FieldDescription>
        </FieldRoot>,
      );
      root.flush();

      const highlight = container.querySelector(".highlight");
      expect(highlight).not.toBeNull();
      expect(highlight?.textContent).toBe("Important:");
    });
  });
});
