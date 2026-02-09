import type { Handle, Props } from "@remix-run/component";
import { DialogRoot } from "../root/dialog-root";
import { Button } from "../../button/button";

/**
 * Props passed to the DialogClose render function.
 */
export interface DialogCloseProps extends Props<"button"> {}

/**
 * A button that closes the dialog.
 * Renders a `<button>` element that calls close() on the native dialog.
 *
 * @example
 * ```tsx
 * <Dialog.Popup>
 *   <Dialog.Title>Title</Dialog.Title>
 *   <Dialog.Close>Close</Dialog.Close>
 * </Dialog.Popup>
 * ```
 */
export function DialogClose(handle: Handle) {
  const ctx = handle.context.get(DialogRoot);

  return (props: DialogCloseProps) => {
    return (
      <Button
        on={{
          click: () => {
            if (!props.disabled) {
              ctx.close();
            }
          },
        }}
        {...props}
      />
    );
  };
}

/**
 * Namespace containing all DialogClose-related types.
 */
export namespace DialogClose {
  export type Props = DialogCloseProps;
}
