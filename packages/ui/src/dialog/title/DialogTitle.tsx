import type { Handle, Props, RemixNode } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";
import { generateId } from "../../utils/generate-id";

/**
 * Setup configuration for the DialogTitle component.
 */
export interface DialogTitleSetup {}

/**
 * Props passed to the DialogTitle render function.
 */
export interface DialogTitleProps extends Props<"h2"> {
  children: RemixNode;
  class?: string;
}

/**
 * State of the dialog title.
 */
export interface DialogTitleState {}

/**
 * A heading that labels the dialog.
 * Renders an `<h2>` element.
 *
 * @example
 * ```tsx
 * <Dialog.Popup>
 *   <Dialog.Title>Confirm Action</Dialog.Title>
 *   <Dialog.Description>Are you sure?</Dialog.Description>
 * </Dialog.Popup>
 * ```
 */
export function DialogTitle(handle: Handle, _setup: DialogTitleSetup = {}) {
  const ctx = handle.context.get(DialogRoot);
  const id = generateId("dialog-title");

  if (ctx) {
    ctx.setTitleId(id);
    handle.signal.addEventListener("abort", () => {
      ctx.setTitleId(null);
    });
  }

  return (props: DialogTitleProps) => {
    const { children, class: className, ...rest } = props;

    return (
      <h2 id={id} class={className} {...rest}>
        {children}
      </h2>
    );
  };
}

/**
 * Namespace containing all DialogTitle-related types.
 */
export namespace DialogTitle {
  export type Setup = DialogTitleSetup;
  export type Props = DialogTitleProps;
  export type State = DialogTitleState;
}
