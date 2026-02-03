import type { Handle, Props } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";

/**
 * Setup configuration for the DialogBackdrop component.
 */
export interface DialogBackdropSetup {}

/**
 * Props passed to the DialogBackdrop render function.
 */
export interface DialogBackdropProps extends Props<"div"> {
  class?: string;
}

/**
 * State of the dialog backdrop.
 */
export interface DialogBackdropState {
  open: boolean;
}

function getBackdropDataAttributes(state: DialogBackdropState): Record<string, string> {
  return state.open ? { "data-open": "" } : { "data-closed": "" };
}

/**
 * An overlay displayed beneath the popup.
 * Renders a `<div>` element.
 *
 * @example
 * ```tsx
 * <Dialog.Root setup={{}}>
 *   <Dialog.Trigger>Open</Dialog.Trigger>
 *   <Dialog.Portal>
 *     <Dialog.Backdrop />
 *     <Dialog.Popup>Content</Dialog.Popup>
 *   </Dialog.Portal>
 * </Dialog.Root>
 * ```
 */
export function DialogBackdrop(handle: Handle, _setup: DialogBackdropSetup = {}) {
  const ctx = handle.context.get(DialogRoot);

  return (props: DialogBackdropProps) => {
    const { class: className, ...rest } = props;

    if (!ctx) {
      return <div role="presentation" class={className} {...rest} />;
    }

    const state: DialogBackdropState = {
      open: ctx.open,
    };
    const dataAttrs = getBackdropDataAttributes(state);

    return (
      <div
        role="presentation"
        hidden={!ctx.open}
        class={className}
        style={{
          userSelect: "none",
        }}
        on={{
          click: () => {
            if (ctx.dismissOnOutsidePress) {
              ctx.closeDialog("outside-press");
            }
          },
        }}
        {...dataAttrs}
        {...rest}
      />
    );
  };
}

/**
 * Namespace containing all DialogBackdrop-related types.
 */
export namespace DialogBackdrop {
  export type Setup = DialogBackdropSetup;
  export type Props = DialogBackdropProps;
  export type State = DialogBackdropState;
}
