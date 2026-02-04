import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";
import { DialogPopup } from "../popup/DialogPopup";
import { DialogTitle } from "./DialogTitle";
import { DialogTrigger } from "../trigger/DialogTrigger";

describe("DialogTitle", () => {
  it("renders an h2 by default", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(
      <DialogRoot>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPopup>
          <DialogTitle>Title text</DialogTitle>
        </DialogPopup>
      </DialogRoot>,
    );
    root.flush();

    const trigger = container.querySelector("button");
    trigger?.click();
    root.flush();

    const title = container.querySelector("h2");
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe("Title text");
  });

  it("renders the specified heading tag", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(
      <DialogRoot>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPopup>
          <DialogTitle as="h3">Heading</DialogTitle>
        </DialogPopup>
      </DialogRoot>,
    );
    root.flush();

    const trigger = container.querySelector("button");
    trigger?.click();
    root.flush();

    const title = container.querySelector("h3");
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe("Heading");
  });

  it("registers its id with the dialog popup", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(
      <DialogRoot>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPopup>
          <DialogTitle>Modal title</DialogTitle>
        </DialogPopup>
      </DialogRoot>,
    );
    root.flush();

    const trigger = container.querySelector("button");
    trigger?.click();
    root.flush();

    const title = container.querySelector("h2");
    const popup = container.querySelector("[role='dialog']");

    expect(title).not.toBeNull();
    expect(popup?.getAttribute("aria-labelledby")).toBe(title?.id ?? null);
  });
});
