import type { Handle, Props, RemixNode } from "@remix-run/component";
import { type Align, Positioner, PositionerArrow, type Side } from "./positioner";

interface PopoverContextValue {
  open: boolean;
  triggerRef: HTMLElement | null;
  setTriggerRef: (el: HTMLElement | null) => void;
  openPopover: () => void;
  closePopover: () => void;
  toggle: () => void;
  popoverId: string;
}

function generateId(): string {
  return `popover-${Math.random().toString(36).slice(2, 9)}`;
}

export function PopoverRoot(
  handle: Handle<PopoverContextValue>,
  setup: {
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  },
) {
  let open = setup.defaultOpen ?? false;
  let triggerRef: HTMLElement | null = null;
  const popoverId = generateId();

  const setTriggerRef = (el: HTMLElement | null) => {
    triggerRef = el;
  };

  const openPopover = () => {
    if (!open) {
      open = true;
      setup.onOpenChange?.(true);
      handle.update();
    }
  };

  const closePopover = () => {
    if (open) {
      open = false;
      setup.onOpenChange?.(false);
      handle.update();
    }
  };

  const toggle = () => {
    if (open) {
      closePopover();
    } else {
      openPopover();
    }
  };

  handle.context.set({
    get open() {
      return open;
    },
    get triggerRef() {
      return triggerRef;
    },
    setTriggerRef,
    openPopover,
    closePopover,
    toggle,
    popoverId,
  });

  return (props: {
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: RemixNode;
  }) => <>{props.children}</>;
}

export function PopoverTrigger(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  return (props: Props<"button"> & { class?: string }) => {
    const { class: className, children, ...rest } = props;

    return (
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={ctx?.open ?? false}
        aria-controls={ctx?.popoverId}
        data-state={ctx?.open ? "open" : "closed"}
        connect={(el: HTMLButtonElement) => {
          ctx?.setTriggerRef(el);
        }}
        on={{
          click: () => ctx?.toggle(),
        }}
        class={className}
        {...rest}
      >
        {children}
      </button>
    );
  };
}

export function PopoverPortal(handle: Handle) {
  return (props: { children: RemixNode }) => {
    const ctx = handle.context.get(PopoverRoot);
    if (!ctx?.open) return null;
    return <>{props.children}</>;
  };
}

export function PopoverBackdrop(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  return (props: Props<"div"> & { class?: string }) => {
    const { class: className, ...rest } = props;

    return (
      <div
        data-state={ctx?.open ? "open" : "closed"}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        on={{
          click: () => ctx?.closePopover(),
        }}
        class={className}
        {...rest}
      />
    );
  };
}

export function PopoverPositioner(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  return (
    props: Props<"div"> & {
      side?: Side;
      align?: Align;
      sideOffset?: number;
      alignOffset?: number;
      collisionPadding?: number;
      arrowPadding?: number;
      sticky?: boolean;
      class?: string;
      children: RemixNode;
    },
  ) => {
    const {
      side = "bottom",
      align = "center",
      sideOffset = 8,
      alignOffset = 0,
      collisionPadding = 8,
      arrowPadding = 5,
      sticky = false,
      class: className,
      children,
      ...rest
    } = props;

    return (
      <Positioner
        anchor={ctx?.triggerRef ?? null}
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        arrowPadding={arrowPadding}
        sticky={sticky}
        class={className}
        {...rest}
      >
        {children}
      </Positioner>
    );
  };
}

export function PopoverContent(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      ctx?.closePopover();
    }
  };

  handle.on(document, { keydown: handleKeyDown });

  return (
    props: Props<"div"> & {
      class?: string;
      children: RemixNode;
    },
  ) => {
    const { class: className, children, ...rest } = props;

    return (
      <div
        id={ctx?.popoverId}
        role="dialog"
        aria-modal="false"
        data-state={ctx?.open ? "open" : "closed"}
        connect={(el: HTMLDivElement) => {
          el.focus();
        }}
        tabindex={-1}
        class={className}
        {...rest}
      >
        {children}
      </div>
    );
  };
}

export function PopoverClose(handle: Handle) {
  const ctx = handle.context.get(PopoverRoot);

  return (props: Props<"button"> & { class?: string }) => {
    const { class: className, children, ...rest } = props;

    return (
      <button
        type="button"
        data-state={ctx?.open ? "open" : "closed"}
        on={{
          click: () => ctx?.closePopover(),
        }}
        class={className}
        {...rest}
      >
        {children}
      </button>
    );
  };
}

export function PopoverArrow(_handle: Handle) {
  return (props: Props<"div"> & { width?: number; height?: number; class?: string }) => {
    return <PositionerArrow {...props} />;
  };
}

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Backdrop: PopoverBackdrop,
  Positioner: PopoverPositioner,
  Content: PopoverContent,
  Close: PopoverClose,
  Arrow: PopoverArrow,
};

export type { Side as PopoverSide, Align as PopoverAlign };
