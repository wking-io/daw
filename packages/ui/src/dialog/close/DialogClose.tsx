import type { Handle, Props, RemixNode } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";

/**
 * Setup configuration for the DialogClose component.
 */
export interface DialogCloseSetup {
  /**
   * Whether the close button is disabled.
   * @default false
   */
  disabled?: boolean;
}

/**
 * Props passed to the DialogClose render function.
 */
export interface DialogCloseProps extends Props<"button"> {
  children: RemixNode;
  class?: string;
}

/**
 * State of the dialog close button.
 */
export interface DialogCloseState {
  disabled: boolean;
}

function getCloseDataAttributes(state: DialogCloseState): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (state.disabled) attrs["data-disabled"] = "";
  return attrs;
}

/**
 * A button that closes the dialog.
 * Renders a `<button>` element.
 *
 * @example
 * ```tsx
 * <Dialog.Popup>
 *   <Dialog.Title>Title</Dialog.Title>
 *   <Dialog.Close>Close</Dialog.Close>
 * </Dialog.Popup>
 * ```
 */
export function DialogClose(handle: Handle, setup: DialogCloseSetup = {}) {
  const ctx = handle.context.get(DialogRoot);
  const disabled = setup.disabled ?? false;

  return (props: DialogCloseProps) => {
    const { children, class: className, ...rest } = props;

    const state: DialogCloseState = {
      disabled,
    };
    const dataAttrs = getCloseDataAttributes(state);

    return (
      <button
        type="button"
        disabled={disabled}
        class={className}
        on={{
          click: () => {
            if (!disabled && ctx) {
              ctx.closeDialog("close-press");
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
 * Namespace containing all DialogClose-related types.
 */
export namespace DialogClose {
  export type Setup = DialogCloseSetup;
  export type Props = DialogCloseProps;
  export type State = DialogCloseState;
}
