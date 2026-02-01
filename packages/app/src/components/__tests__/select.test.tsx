import { describe, expect, it, mock } from "bun:test";
import { createRoot } from "@remix-run/component";
import { Select } from "../control-panel/select";

describe("Select", () => {
  const options = ["option1", "option2", "option3"];

  it("renders the current value in the input", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange: () => {}, options }} value="option2" />);
    root.flush();

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("option2");
  });

  it("clicking next button calls onChange with next option", () => {
    const onChange = mock(() => {});
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange, options }} value="option1" />);
    root.flush();

    const buttons = container.querySelectorAll("button");
    const nextButton = buttons[1];
    nextButton?.click();
    root.flush();

    expect(onChange).toHaveBeenCalledWith("option2");
  });

  it("clicking prev button calls onChange with previous option", () => {
    const onChange = mock(() => {});
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange, options }} value="option2" />);
    root.flush();

    const buttons = container.querySelectorAll("button");
    const prevButton = buttons[0];
    prevButton?.click();
    root.flush();

    expect(onChange).toHaveBeenCalledWith("option1");
  });

  it("ArrowRight key calls onChange with next option", () => {
    const onChange = mock(() => {});
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange, options }} value="option1" />);
    root.flush();

    const input = container.querySelector("input");
    input?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    root.flush();

    expect(onChange).toHaveBeenCalledWith("option2");
  });

  it("ArrowLeft key calls onChange with previous option", () => {
    const onChange = mock(() => {});
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange, options }} value="option2" />);
    root.flush();

    const input = container.querySelector("input");
    input?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    root.flush();

    expect(onChange).toHaveBeenCalledWith("option1");
  });

  it("wraps to last option when pressing prev at start", () => {
    const onChange = mock(() => {});
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange, options }} value="option1" />);
    root.flush();

    const buttons = container.querySelectorAll("button");
    const prevButton = buttons[0];
    prevButton?.click();
    root.flush();

    expect(onChange).toHaveBeenCalledWith("option3");
  });

  it("wraps to first option when pressing next at end", () => {
    const onChange = mock(() => {});
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange, options }} value="option3" />);
    root.flush();

    const buttons = container.querySelectorAll("button");
    const nextButton = buttons[1];
    nextButton?.click();
    root.flush();

    expect(onChange).toHaveBeenCalledWith("option1");
  });

  it("buttons are disabled when disabled is true", () => {
    const onChange = mock(() => {});
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange, options, disabled: true }} value="option1" />);
    root.flush();

    const buttons = container.querySelectorAll("button");
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(true);

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input?.disabled).toBe(true);
  });

  it("does not call onChange when disabled and clicked", () => {
    const onChange = mock(() => {});
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange, options, disabled: true }} value="option1" />);
    root.flush();

    const buttons = container.querySelectorAll("button");
    buttons[1]?.click();
    root.flush();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("input is readonly", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<Select setup={{ onChange: () => {}, options }} value="option1" />);
    root.flush();

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });
});
