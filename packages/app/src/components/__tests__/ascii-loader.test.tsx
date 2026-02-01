import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createRoot, type VirtualRoot } from "@remix-run/component";
import { AsciiLoader, asciiOptions, isAsciiLoaderType } from "../ascii-loader";

describe("AsciiLoader", () => {
  let container: HTMLDivElement;
  let root: VirtualRoot;

  beforeEach(() => {
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    root.remove();
  });

  describe("rendering", () => {
    it("renders a pre element", () => {
      root.render(<AsciiLoader setup={{ loader: "dots" }} loader="dots" />);
      root.flush();

      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
    });

    it("renders with font-mono class", () => {
      root.render(<AsciiLoader setup={{ loader: "dots" }} loader="dots" />);
      root.flush();

      const pre = container.querySelector("pre");
      expect(pre?.classList.contains("font-mono")).toBe(true);
    });

    it("renders first frame initially", () => {
      root.render(<AsciiLoader setup={{ loader: "dots" }} loader="dots" />);
      root.flush();

      const pre = container.querySelector("pre");
      expect(pre?.textContent).toBe("⠋");
    });

    it("renders different loader types", () => {
      root.render(<AsciiLoader setup={{ loader: "line" }} loader="line" />);
      root.flush();

      const pre = container.querySelector("pre");
      expect(pre?.textContent).toBe("-");
    });
  });

  describe("loader switching", () => {
    it("changes loader when props change", () => {
      root.render(<AsciiLoader setup={{ loader: "dots" }} loader="dots" />);
      root.flush();

      let pre = container.querySelector("pre");
      expect(pre?.textContent).toBe("⠋");

      root.render(<AsciiLoader setup={{ loader: "dots" }} loader="line" />);
      root.flush();

      pre = container.querySelector("pre");
      expect(pre?.textContent).toBe("-");
    });
  });
});

describe("asciiOptions", () => {
  it("exports array of loader types", () => {
    expect(Array.isArray(asciiOptions)).toBe(true);
    expect(asciiOptions.length).toBeGreaterThan(0);
  });

  it("includes common loader types", () => {
    expect(asciiOptions).toContain("dots");
    expect(asciiOptions).toContain("line");
    expect(asciiOptions).toContain("arrow");
  });
});

describe("isAsciiLoaderType", () => {
  it("returns true for valid loader types", () => {
    expect(isAsciiLoaderType("dots")).toBe(true);
    expect(isAsciiLoaderType("line")).toBe(true);
    expect(isAsciiLoaderType("arrow")).toBe(true);
  });

  it("returns false for invalid loader types", () => {
    expect(isAsciiLoaderType("invalid")).toBe(false);
    expect(isAsciiLoaderType("")).toBe(false);
    expect(isAsciiLoaderType("notaloader")).toBe(false);
  });
});
