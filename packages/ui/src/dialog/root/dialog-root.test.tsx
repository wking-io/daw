import { describe, expect, it, mock } from "bun:test";
import { createRoot } from "@remix-run/component";
import { DialogRoot } from "./dialog-root";
import { DialogTrigger } from "../trigger/dialog-trigger";
import { DialogPopup } from "../popup/dialog-popup";
import { DialogTitle } from "../title/dialog-title";
import { DialogDescription } from "../description/dialog-description";
import { DialogClose } from "../close/dialog-close";

describe("Dialog", () => {
  describe("DialogRoot", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <div data-testid="child">Child content</div>
        </DialogRoot>,
      );
      root.flush();

      expect(container.querySelector("[data-testid='child']")).not.toBeNull();
    });

    it("starts closed by default", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>Content</DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const dialog = container.querySelector("dialog") as HTMLDialogElement | null;
      expect(dialog).not.toBeNull();
      expect(dialog?.open).toBe(false);
    });
  });

  describe("DialogTrigger", () => {
    it("opens dialog on click", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>Content</DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      const dialog = container.querySelector("dialog") as HTMLDialogElement | null;
      expect(dialog?.open).toBe(true);
    });

    it("has correct ARIA attributes", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>Content</DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      expect(trigger?.getAttribute("aria-haspopup")).toBe("dialog");
      expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    });

    it("updates aria-expanded when open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>Content</DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      expect(trigger?.getAttribute("aria-expanded")).toBe("false");

      trigger?.click();
      root.flush();

      expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("DialogPopup", () => {
    it("has role='dialog'", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogPopup>Content</DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const popup = container.querySelector("[role='dialog']");
      expect(popup).not.toBeNull();
    });

    it("removes children after native close event", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>
            <div data-testid="dialog-content">Content</div>
          </DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      expect(container.querySelector("[data-testid='dialog-content']")).not.toBeNull();

      const dialog = container.querySelector("dialog") as HTMLDialogElement | null;
      if (dialog) {
        dialog.open = false;
        dialog.dispatchEvent(new Event("close"));
      }
      root.flush();

      expect(container.querySelector("[data-testid='dialog-content']")).toBeNull();
    });
  });

  describe("DialogTitle", () => {
    it("renders with correct aria-labelledby on popup", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>
            <DialogTitle>My Title</DialogTitle>
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
      expect(title?.textContent).toBe("My Title");
      expect(popup?.getAttribute("aria-labelledby")).toBe(title?.id ?? null);
    });
  });

  describe("DialogDescription", () => {
    it("renders with correct aria-describedby on popup", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>
            <DialogDescription>My Description</DialogDescription>
          </DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      const description = container.querySelector("p");
      const popup = container.querySelector("[role='dialog']");

      expect(description).not.toBeNull();
      expect(description?.textContent).toBe("My Description");
      expect(popup?.getAttribute("aria-describedby")).toBe(description?.id ?? null);
    });
  });

  describe("DialogClose", () => {
    it("closes dialog on click", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>
            <DialogClose>Close</DialogClose>
          </DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      const dialog = container.querySelector("dialog") as HTMLDialogElement | null;
      expect(dialog?.open).toBe(true);

      const closeButton = container.querySelectorAll("button")[1];
      closeButton?.click();
      root.flush();

      expect(dialog?.open).toBe(false);
    });
  });

  describe("onOpen callback", () => {
    it("calls onOpen when opening", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const onOpen = mock(() => {});

      root.render(
        <DialogRoot onOpen={onOpen}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>Content</DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe("onClose callback", () => {
    it("calls onClose when closing via Close button", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const onClose = mock(() => {});

      root.render(
        <DialogRoot setup={{}} onClose={onClose}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogPopup>
            <DialogClose>Close</DialogClose>
          </DialogPopup>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      const closeButton = container.querySelectorAll("button")[1];
      closeButton?.click();
      root.flush();

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
