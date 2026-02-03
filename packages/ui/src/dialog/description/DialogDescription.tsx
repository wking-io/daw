import type { Handle, Props, RemixNode } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";
import { generateId } from "../../utils/generate-id";

/**
 * Setup configuration for the DialogDescription component.
 */
export interface DialogDescriptionSetup {}

/**
 * Props passed to the DialogDescription render function.
 */
export interface DialogDescriptionProps extends Props<"p"> {
  children: RemixNode;
  class?: string;
}

/**
 * State of the dialog description.
 */
export interface DialogDescriptionState {}

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
export function DialogDescription(handle: Handle, _setup: DialogDescriptionSetup = {}) {
  const ctx = handle.context.get(DialogRoot);
  const id = generateId("dialog-desc");

  if (ctx) {
    ctx.setDescriptionId(id);
    handle.signal.addEventListener("abort", () => {
      ctx.setDescriptionId(null);
    });
  }

  return (props: DialogDescriptionProps) => {
    const { children, class: className, ...rest } = props;

    return (
      <p id={id} class={className} {...rest}>
        {children}
      </p>
    );
  };
}

/**
 * Namespace containing all DialogDescription-related types.
 */
export namespace DialogDescription {
  export type Setup = DialogDescriptionSetup;
  export type Props = DialogDescriptionProps;
  export type State = DialogDescriptionState;
}
