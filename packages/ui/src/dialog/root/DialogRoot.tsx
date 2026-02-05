import type { Handle, RemixNode } from "@remix-run/component";
import { generateId } from "../../utils/generate-id";

/**
 * Setup configuration for the Dialog component.
 */
export interface DialogRootSetup {
  /**
   * Whether the dialog should be modal.
   * - `true`: uses showModal() - user interaction is limited to the dialog, has backdrop
   * - `false`: uses show() - non-modal, no backdrop
   * @default true
   */
  modal?: boolean;
  /**
   * The duration of the exit animation in milliseconds.
   * If set to 0, the dialog will close immediately.
   * @default 0
   */
  exitDuration?: number;
}

/**
 * Props passed to the DialogRoot render function.
 */
export interface DialogRootProps {
  children: RemixNode;
  /**
   * Callback fired when the dialog opens.
   */
  onOpen?: () => void;
  /**
   * Callback fired when the dialog closes.
   */
  onClose?: () => void;
}

/**
 * Context value provided by DialogRoot.
 */
export interface DialogRootContextValue {
  modal: boolean;
  state: "open" | "closing" | "closed";
  dialogId: string;
  titleId: string;
  descriptionId: string;
  dialogRef: HTMLDialogElement | null;
  setDialogRef: (el: HTMLDialogElement | null) => void;
  open: () => void;
  close: () => void;
  cleanup: () => void;
}

/**
 * Root component for a dialog using the native <dialog> element.
 * Provides context for trigger, popup, and other dialog parts.
 * Doesn't render its own HTML element.
 *
 * The native dialog element handles:
 * - Modal behavior (focus trapping, backdrop)
 * - Escape key to close
 * - Top layer positioning
 *
 * Use `::backdrop` pseudo-selector to style the backdrop.
 *
 * @example
 * ```tsx
 * <Dialog.Root setup={{ modal: true, onOpen: () => {}, onClose: () => {} }}>
 *   <Dialog.Trigger>Open</Dialog.Trigger>
 *   <Dialog.Popup>
 *     <Dialog.Title>Dialog Title</Dialog.Title>
 *     <Dialog.Description>Dialog description</Dialog.Description>
 *     <Dialog.Close>Close</Dialog.Close>
 *   </Dialog.Popup>
 * </Dialog.Root>
 * ```
 */
export function DialogRoot(handle: Handle<DialogRootContextValue>, setup?: DialogRootSetup) {
  const modal = setup?.modal ?? true;
  let dialogRef: HTMLDialogElement | null = null;
  const dialogId = generateId("dialog");
  const titleId = generateId("dialog-title");
  const descriptionId = generateId("dialog-description");
  const exitDuration = setup?.exitDuration ?? 0;
  let onOpen = () => {};
  let onClose = () => {};
  let closeTimeout: ReturnType<typeof setTimeout> | null = null;
  let state: DialogRootContextValue["state"] = "closed";

  const setDialogRef = (el: HTMLDialogElement | null) => {
    dialogRef = el;
  };

  const open = () => {
    if (dialogRef && !dialogRef.open) {
      if (modal) {
        dialogRef.showModal();
      } else {
        dialogRef.show();
      }
      state = "open";
      onOpen?.();
      handle.update();
    }
  };

  const close = () => {
    if (!dialogRef) return;

    if (exitDuration > 0) {
      if (state === "closing") return;
      state = "closing";
      handle.update();

      closeTimeout = setTimeout(() => {
        state = "closed";
        closeTimeout = null;
        if (dialogRef?.open) {
          dialogRef.close();
        }
        onClose?.();
        handle.update();
      }, exitDuration);
    } else {
      state = "closed";
      if (dialogRef.open) {
        dialogRef.close();
      }
      onClose?.();
      handle.update();
    }
  };

  const cleanup = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
  };

  handle.context.set({
    modal,
    get state() {
      return state;
    },
    dialogId,
    titleId,
    descriptionId,
    get dialogRef() {
      return dialogRef;
    },
    setDialogRef,
    open,
    close,
    cleanup,
  });

  return (props: DialogRootProps) => {
    onOpen = props.onOpen ?? onOpen;
    onClose = props.onClose ?? onClose;
    return <>{props.children}</>;
  };
}

/**
 * Namespace containing all DialogRoot-related types.
 */
export namespace DialogRoot {
  export type Setup = DialogRootSetup;
  export type Props = DialogRootProps;
  export type ContextValue = DialogRootContextValue;
}
