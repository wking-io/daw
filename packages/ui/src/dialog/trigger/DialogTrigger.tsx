import type { Handle, Props } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";
import { getDataAttributes } from "../../utils/data-attributes";
import { Button } from "../../button/Button";

/**
 * Props passed to the DialogTrigger render function.
 */
export interface DialogTriggerProps extends Props<"button"> {}

/**
 * A button that opens the dialog.
 * Renders a `<button>` element that calls showModal() or show() on the dialog.
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger>Open Dialog</Dialog.Trigger>
 *   <Dialog.Popup>Content</Dialog.Popup>
 * </Dialog.Root>
 * ```
 */
export function DialogTrigger(handle: Handle) {
  const ctx = handle.context.get(DialogRoot);

  return (props: DialogTriggerProps) => {
    const dataAttrs = getDataAttributes({
      open: ctx.state === "open",
    });

    return (
      <Button
        aria-haspopup="dialog"
        aria-expanded={ctx.state === "open"}
        aria-controls={ctx.dialogId}
        on={{
          click: () => {
            if (!props.disabled) {
              ctx.open();
            }
          },
        }}
        {...dataAttrs}
        {...props}
      />
    );
  };
}

/**
 * Namespace containing all DialogTrigger-related types.
 */
export namespace DialogTrigger {
  export type Props = DialogTriggerProps;
}
