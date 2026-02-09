import type { Handle, RemixNode } from "@remix-run/component";
import { generateId } from "../../utils/generate-id";

/**
 * Setup configuration for the Popover component.
 */
export interface PopoverRootSetup {
  /**
   * Whether the popover is open by default.
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * Callback when the open state changes.
   */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Props passed to the PopoverRoot render function.
 */
export interface PopoverRootProps {
  children: RemixNode;
}

/**
 * State of the popover.
 */
export interface PopoverRootState {
  open: boolean;
}

/**
 * Context value provided by PopoverRoot.
 */
export interface PopoverRootContextValue {
  open: boolean;
  triggerRef: HTMLElement | null;
  setTriggerRef: (el: HTMLElement | null) => void;
  openPopover: () => void;
  closePopover: () => void;
  toggle: () => void;
  popoverId: string;
}

/**
 * Root component for a popover.
 * Provides context for trigger, content, and other popover parts.
 *
 * @example
 * ```tsx
 * <Popover.Root setup={{}}>
 *   <Popover.Trigger>Open</Popover.Trigger>
 *   <Popover.Portal>
 *     <Popover.Content>Content here</Popover.Content>
 *   </Popover.Portal>
 * </Popover.Root>
 * ```
 */
export function PopoverRoot(handle: Handle<PopoverRootContextValue>, setup: PopoverRootSetup = {}) {
  let open = setup.defaultOpen ?? false;
  let triggerRef: HTMLElement | null = null;
  const popoverId = generateId("popover");

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

  return (props: PopoverRootProps) => <>{props.children}</>;
}

/**
 * Namespace containing all PopoverRoot-related types.
 */
export namespace PopoverRoot {
  export type Setup = PopoverRootSetup;
  export type Props = PopoverRootProps;
  export type State = PopoverRootState;
  export type ContextValue = PopoverRootContextValue;
}
