import type { Handle, Props } from "@remix-run/component";
import { DialogRoot } from "../root/dialog-root";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingProps = Props<HeadingTag>;

/**
 * Props passed to the DialogTitle render function.
 */
export interface DialogTitleProps extends HeadingProps {
  as?: HeadingTag;
}

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
export function DialogTitle(handle: Handle) {
  const ctx = handle.context.get(DialogRoot);

  return (props: DialogTitleProps) => {
    const { as: Tag = "h2", ...rest } = props;
    return <Tag id={ctx?.titleId} {...rest} />;
  };
}

/**
 * Namespace containing all DialogTitle-related types.
 */
export namespace DialogTitle {
  export type Props = DialogTitleProps;
}
