import { describe, expect, it, mock } from "bun:test";
import { createRoot } from "@remix-run/component";
import { DialogRoot } from "./DialogRoot";
import { DialogTrigger } from "../trigger/DialogTrigger";
import { DialogPortal } from "../portal/DialogPortal";
import { DialogBackdrop } from "../backdrop/DialogBackdrop";
import { DialogPopup } from "../popup/DialogPopup";
import { DialogTitle } from "../title/DialogTitle";
import { DialogDescription } from "../description/DialogDescription";
import { DialogClose } from "../close/DialogClose";

describe("Dialog", () => {
  describe("DialogRoot", () => {
    it("renders children", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{}}>
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
        <DialogRoot setup={{}}>
          <DialogTrigger setup={{}}>Open</DialogTrigger>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      expect(container.querySelector("[role='dialog']")).toBeNull();
    });

    it("respects defaultOpen", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{ defaultOpen: true }}>
          <DialogTrigger setup={{}}>Open</DialogTrigger>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      expect(container.querySelector("[role='dialog']")).not.toBeNull();
    });
  });

  describe("DialogTrigger", () => {
    it("opens dialog on click", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{}}>
          <DialogTrigger setup={{}}>Open</DialogTrigger>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      expect(container.querySelector("[role='dialog']")).not.toBeNull();
    });

    it("has correct ARIA attributes", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{}}>
          <DialogTrigger setup={{}}>Open</DialogTrigger>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
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
        <DialogRoot setup={{ defaultOpen: true }}>
          <DialogTrigger setup={{}}>Open</DialogTrigger>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    });
  });

  describe("DialogPopup", () => {
    it("has role='dialog'", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{ defaultOpen: true }}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const popup = container.querySelector("[role='dialog']");
      expect(popup).not.toBeNull();
    });

    it("has aria-modal when modal", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{ defaultOpen: true, modal: true }}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const popup = container.querySelector("[role='dialog']");
      expect(popup?.getAttribute("aria-modal")).toBe("true");
    });

    it("has data-open when open", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{ defaultOpen: true }}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const popup = container.querySelector("[role='dialog']");
      expect(popup?.hasAttribute("data-open")).toBe(true);
    });
  });

  describe("DialogTitle", () => {
    it("renders with correct aria-labelledby on popup", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{ defaultOpen: true }}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>
              <DialogTitle setup={{}}>My Title</DialogTitle>
            </DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();
      // Flush again to process the queued update from setTitleId
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
        <DialogRoot setup={{ defaultOpen: true }}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>
              <DialogDescription setup={{}}>My Description</DialogDescription>
            </DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();
      // Flush again to process the queued update from setDescriptionId
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
        <DialogRoot setup={{ defaultOpen: true }}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>
              <DialogClose setup={{}}>Close</DialogClose>
            </DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      expect(container.querySelector("[role='dialog']")).not.toBeNull();

      const closeButton = container.querySelector("button");
      closeButton?.click();
      root.flush();

      expect(container.querySelector("[role='dialog']")).toBeNull();
    });
  });

  describe("DialogBackdrop", () => {
    it("renders with role='presentation'", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{ defaultOpen: true }}>
          <DialogPortal setup={{}}>
            <DialogBackdrop setup={{}} />
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const backdrop = container.querySelector("[role='presentation']");
      expect(backdrop).not.toBeNull();
    });

    it("closes dialog when clicked", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{ defaultOpen: true, dismissOnOutsidePress: true }}>
          <DialogPortal setup={{}}>
            <DialogBackdrop setup={{}} />
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      expect(container.querySelector("[role='dialog']")).not.toBeNull();

      const backdrop = container.querySelector("[role='presentation']");
      (backdrop as HTMLElement)?.click();
      root.flush();

      expect(container.querySelector("[role='dialog']")).toBeNull();
    });
  });

  describe("onOpenChange callback", () => {
    it("calls onOpenChange when opening", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const onOpenChange = mock((_open: boolean, _reason: string) => {});

      root.render(
        <DialogRoot setup={{}} onOpenChange={onOpenChange}>
          <DialogTrigger setup={{}}>Open</DialogTrigger>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const trigger = container.querySelector("button");
      trigger?.click();
      root.flush();

      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange.mock.calls[0]?.[0]).toBe(true);
      expect(onOpenChange.mock.calls[0]?.[1]).toBe("trigger-press");
    });

    it("calls onOpenChange when closing via Close button", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const onOpenChange = mock((_open: boolean, _reason: string) => {});

      root.render(
        <DialogRoot setup={{ defaultOpen: true }} onOpenChange={onOpenChange}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>
              <DialogClose setup={{}}>Close</DialogClose>
            </DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const closeButton = container.querySelector("button");
      closeButton?.click();
      root.flush();

      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
      expect(onOpenChange.mock.calls[0]?.[1]).toBe("close-press");
    });

    it("calls onOpenChange when closing via backdrop click", () => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const onOpenChange = mock((_open: boolean, _reason: string) => {});

      root.render(
        <DialogRoot
          setup={{ defaultOpen: true, dismissOnOutsidePress: true }}
          onOpenChange={onOpenChange}
        >
          <DialogPortal setup={{}}>
            <DialogBackdrop setup={{}} />
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      const backdrop = container.querySelector("[role='presentation']");
      (backdrop as HTMLElement)?.click();
      root.flush();

      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
      expect(onOpenChange.mock.calls[0]?.[1]).toBe("outside-press");
    });
  });

  describe("controlled mode", () => {
    it("respects controlled open prop", () => {
      const container = document.createElement("div");
      const root = createRoot(container);

      root.render(
        <DialogRoot setup={{}} open={true}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      expect(container.querySelector("[role='dialog']")).not.toBeNull();

      // Re-render with open=false
      root.render(
        <DialogRoot setup={{}} open={false}>
          <DialogPortal setup={{}}>
            <DialogPopup setup={{}}>Content</DialogPopup>
          </DialogPortal>
        </DialogRoot>,
      );
      root.flush();

      expect(container.querySelector("[role='dialog']")).toBeNull();
    });
  });
});
