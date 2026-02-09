import type { Handle, Props, RemixNode } from "@remix-run/component";
import { DialogRoot } from "../root/dialog-root";
import { getDataAttributes } from "../../utils/data-attributes";
import { Button } from "../../button/button";

/**
 * Props passed to the DialogTrigger render function.
 */
export interface DialogTriggerProps extends Props<"button"> {
  render?: (props: Props<"button">) => RemixNode;
}

/**
 * A button that opens the dialog.
 * Renders a `<button>` element that calls showModal() or show() on the dialog.
 *
 * Supports a `render` prop to replace the default button element while
 * forwarding all trigger behavior (click handler, aria attributes, data attributes).
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger>Open Dialog</Dialog.Trigger>
 *   <Dialog.Popup>Content</Dialog.Popup>
 * </Dialog.Root>
 * ```
 *
 * @example Custom render
 * ```tsx
 * <Dialog.Trigger
 *   render={(props) => <MyButton {...props}>Open</MyButton>}
 * />
 * ```
 */
export function DialogTrigger(handle: Handle) {
  const ctx = handle.context.get(DialogRoot);

  return (props: DialogTriggerProps) => {
    const { render, ...rest } = props;

    const triggerProps = {
      "aria-haspopup": "dialog" as const,
      "aria-expanded": ctx.state === "open",
      "aria-controls": ctx.dialogId,
      on: {
        click: () => {
          if (!props.disabled) {
            ctx.open();
          }
        },
      },
      ...getDataAttributes({ open: ctx.state === "open" }),
      ...rest,
    };

    if (render) {
      return render(triggerProps);
    }

    return <Button {...triggerProps} />;
  };
}

/**
 * Namespace containing all DialogTrigger-related types.
 */
export namespace DialogTrigger {
  export type Props = DialogTriggerProps;
}
