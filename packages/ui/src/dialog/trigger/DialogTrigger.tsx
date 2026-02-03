import type { Handle, Props, RemixNode } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";

/**
 * Setup configuration for the DialogTrigger component.
 */
export interface DialogTriggerSetup {
  /**
   * Whether the trigger is disabled.
   * @default false
   */
  disabled?: boolean;
}

/**
 * Props passed to the DialogTrigger render function.
 */
export interface DialogTriggerProps extends Props<"button"> {
  children: RemixNode;
  class?: string;
}

/**
 * State of the dialog trigger.
 */
export interface DialogTriggerState {
  open: boolean;
  disabled: boolean;
}

function getTriggerDataAttributes(state: DialogTriggerState): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (state.open) attrs["data-open"] = "";
  if (state.disabled) attrs["data-disabled"] = "";
  return attrs;
}

/**
 * A button that opens the dialog.
 * Renders a `<button>` element.
 *
 * @example
 * ```tsx
 * <Dialog.Root setup={{}}>
 *   <Dialog.Trigger>Open Dialog</Dialog.Trigger>
 *   <Dialog.Portal>
 *     <Dialog.Popup>Content</Dialog.Popup>
 *   </Dialog.Portal>
 * </Dialog.Root>
 * ```
 */
export function DialogTrigger(handle: Handle, setup: DialogTriggerSetup = {}) {
  const ctx = handle.context.get(DialogRoot);
  const disabled = setup.disabled ?? false;

  return (props: DialogTriggerProps) => {
    const { children, class: className, ...rest } = props;

    if (!ctx) {
      return (
        <button type="button" class={className} disabled={disabled} {...rest}>
          {children}
        </button>
      );
    }

    const state: DialogTriggerState = {
      open: ctx.open,
      disabled,
    };
    const dataAttrs = getTriggerDataAttributes(state);

    return (
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.dialogId : undefined}
        disabled={disabled}
        class={className}
        connect={(el: HTMLButtonElement) => {
          ctx.setTriggerRef(el);
        }}
        on={{
          click: () => {
            if (!disabled) {
              ctx.toggle("trigger-press");
            }
          },
        }}
        {...dataAttrs}
        {...rest}
      >
        {children}
      </button>
    );
  };
}

/**
 * Namespace containing all DialogTrigger-related types.
 */
export namespace DialogTrigger {
  export type Setup = DialogTriggerSetup;
  export type Props = DialogTriggerProps;
  export type State = DialogTriggerState;
}
