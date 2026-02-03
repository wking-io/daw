import type { Handle, RemixNode } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";

/**
 * Setup configuration for the DialogPortal component.
 */
export interface DialogPortalSetup {
  /**
   * Whether to keep the portal mounted in the DOM while the dialog is closed.
   * @default false
   */
  keepMounted?: boolean;
}

/**
 * Props passed to the DialogPortal render function.
 */
export interface DialogPortalProps {
  children: RemixNode;
}

/**
 * Portal component that conditionally renders children when dialog is open.
 *
 * @example
 * ```tsx
 * <Dialog.Root setup={{}}>
 *   <Dialog.Trigger>Open</Dialog.Trigger>
 *   <Dialog.Portal>
 *     <Dialog.Backdrop />
 *     <Dialog.Popup>Only rendered when open</Dialog.Popup>
 *   </Dialog.Portal>
 * </Dialog.Root>
 * ```
 */
export function DialogPortal(handle: Handle, setup: DialogPortalSetup = {}) {
  const keepMounted = setup.keepMounted ?? false;

  return (props: DialogPortalProps) => {
    const ctx = handle.context.get(DialogRoot);

    if (!keepMounted && !ctx?.open) {
      return null;
    }

    return <>{props.children}</>;
  };
}

/**
 * Namespace containing all DialogPortal-related types.
 */
export namespace DialogPortal {
  export type Setup = DialogPortalSetup;
  export type Props = DialogPortalProps;
}
