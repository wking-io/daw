import type { Handle, Props } from "@remix-run/component";
import { DialogRoot } from "../root/dialog-root";

/**
 * Props passed to the DialogDescription render function.
 */
export interface DialogDescriptionProps extends Props<"p"> {}

/**
 * A paragraph with additional information about the dialog.
 * Renders a `<p>` element.
 *
 * @example
 * ```tsx
 * <Dialog.Popup>
 *   <Dialog.Title>Confirm Action</Dialog.Title>
 *   <Dialog.Description>This action cannot be undone.</Dialog.Description>
 * </Dialog.Popup>
 * ```
 */
export function DialogDescription(handle: Handle) {
  const ctx = handle.context.get(DialogRoot);

  return (props: DialogDescriptionProps) => {
    return <p id={ctx?.descriptionId} {...props} />;
  };
}

/**
 * Namespace containing all DialogDescription-related types.
 */
export namespace DialogDescription {
  export type Props = DialogDescriptionProps;
}
