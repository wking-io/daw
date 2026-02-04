import type { Handle, Props } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";

export interface DialogPopupProps extends Props<"dialog"> {}

/**
 * The dialog popup container using the native <dialog> element.
 * Renders a `<dialog>` element that uses the browser's built-in dialog functionality.
 *
 * Features provided by native dialog:
 * - Modal behavior with showModal() - focus trapping, prevents background interaction
 * - Top layer positioning (above all other content)
 * - Built-in backdrop via ::backdrop pseudo-element
 * - Escape key closes the dialog automatically
 *
 * Style the backdrop using the `::backdrop` pseudo-selector:
 * ```css
 * dialog::backdrop {
 *   background: rgba(0, 0, 0, 0.5);
 * }
 * ```
 *
 * @example
 * ```tsx
 * <Dialog.Root setup={{}}>
 *   <Dialog.Trigger>Open</Dialog.Trigger>
 *   <Dialog.Popup>
 *     <Dialog.Title>Title</Dialog.Title>
 *     <Dialog.Description>Description</Dialog.Description>
 *     <Dialog.Close>Close</Dialog.Close>
 *   </Dialog.Popup>
 * </Dialog.Root>
 * ```
 */
export function DialogPopup(handle: Handle) {
  const ctx = handle.context.get(DialogRoot);

  return (props: DialogPopupProps) => {
    const { children, connect, ...rest } = props;

    if (!ctx) {
      return (
        <dialog role="dialog" connect={connect} {...rest}>
          {children}
        </dialog>
      );
    }

    return (
      <dialog
        id={ctx.dialogId}
        role="dialog"
        aria-labelledby={ctx.titleId ?? undefined}
        aria-describedby={ctx.descriptionId ?? undefined}
        on={{
          close: () => {
            ctx.close();
          },
          cancel: () => {
            ctx.close();
          },
          mousedown: (event) => {
            if (event.target === event.currentTarget) {
              ctx.close();
            }
          },
        }}
        connect={(el: HTMLDialogElement, signal: AbortSignal) => {
          ctx.setDialogRef(el);

          signal.addEventListener("abort", () => {
            ctx.cleanup();
          });

          connect?.(el, signal);
        }}
        {...rest}
      >
        {ctx.state === "open" ? children : null}
      </dialog>
    );
  };
}

/**
 * Namespace containing all DialogPopup-related types.
 */
export namespace DialogPopup {
  export type Props = DialogPopupProps;
}
