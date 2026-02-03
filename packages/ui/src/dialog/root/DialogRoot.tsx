import type { Handle, RemixNode } from "@remix-run/component";
import { generateId } from "../../utils/generate-id";

/**
 * Modal type for the dialog.
 */
export type DialogModal = boolean | "trap-focus";

/**
 * Setup configuration for the Dialog component.
 */
export interface DialogRootSetup {
  /**
   * Whether the dialog is open by default.
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * Determines if the dialog enters a modal state when open.
   * - `true`: user interaction is limited to just the dialog
   * - `false`: user interaction with the rest of the document is allowed
   * - `"trap-focus"`: focus is trapped inside the dialog, but scroll is not locked
   * @default true
   */
  modal?: DialogModal;
  /**
   * Determines whether the dialog should close on outside clicks.
   * @default false
   */
  dismissOnOutsidePress?: boolean;
}

/**
 * Props passed to the DialogRoot render function.
 */
export interface DialogRootProps {
  children: RemixNode;
  /**
   * Controlled open state. When provided, the component is controlled.
   */
  open?: boolean;
  /**
   * Callback when the open state changes.
   */
  onOpenChange?: (open: boolean, reason: DialogCloseReason) => void;
}

/**
 * State of the dialog.
 */
export interface DialogRootState {
  open: boolean;
  modal: DialogModal;
}

/**
 * Reasons for closing the dialog.
 */
export type DialogCloseReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-press"
  | "imperative";

/**
 * Context value provided by DialogRoot.
 */
export interface DialogRootContextValue {
  open: boolean;
  modal: DialogModal;
  dismissOnOutsidePress: boolean;
  triggerRef: HTMLElement | null;
  setTriggerRef: (el: HTMLElement | null) => void;
  popupRef: HTMLElement | null;
  setPopupRef: (el: HTMLElement | null) => void;
  openDialog: (reason?: DialogCloseReason) => void;
  closeDialog: (reason: DialogCloseReason) => void;
  toggle: (reason?: DialogCloseReason) => void;
  dialogId: string;
  titleId: string | null;
  setTitleId: (id: string | null) => void;
  descriptionId: string | null;
  setDescriptionId: (id: string | null) => void;
}

/**
 * Root component for a dialog.
 * Provides context for trigger, popup, and other dialog parts.
 * Doesn't render its own HTML element.
 *
 * @example
 * ```tsx
 * <Dialog.Root setup={{ modal: true }}>
 *   <Dialog.Trigger>Open</Dialog.Trigger>
 *   <Dialog.Portal>
 *     <Dialog.Backdrop />
 *     <Dialog.Popup>
 *       <Dialog.Title>Dialog Title</Dialog.Title>
 *       <Dialog.Description>Dialog description</Dialog.Description>
 *       <Dialog.Close>Close</Dialog.Close>
 *     </Dialog.Popup>
 *   </Dialog.Portal>
 * </Dialog.Root>
 * ```
 */
export function DialogRoot(handle: Handle<DialogRootContextValue>, setup: DialogRootSetup = {}) {
  const modal = setup.modal ?? true;
  const dismissOnOutsidePress = setup.dismissOnOutsidePress ?? true;
  let internalOpen = setup.defaultOpen ?? false;
  let triggerRef: HTMLElement | null = null;
  let popupRef: HTMLElement | null = null;
  const dialogId = generateId("dialog");
  let titleId: string | null = null;
  let descriptionId: string | null = null;

  let currentOnOpenChange: ((open: boolean, reason: DialogCloseReason) => void) | undefined;
  let isControlled = false;
  let controlledOpen = false;

  const getOpen = (): boolean => {
    return isControlled ? controlledOpen : internalOpen;
  };

  const setTriggerRef = (el: HTMLElement | null) => {
    triggerRef = el;
  };

  const setPopupRef = (el: HTMLElement | null) => {
    popupRef = el;
  };

  const setTitleId = (id: string | null) => {
    titleId = id;
  };

  const setDescriptionId = (id: string | null) => {
    descriptionId = id;
  };

  const openDialog = (reason: DialogCloseReason = "trigger-press") => {
    if (!getOpen()) {
      if (!isControlled) {
        internalOpen = true;
      }
      currentOnOpenChange?.(true, reason);
      handle.update();
    }
  };

  const closeDialog = (reason: DialogCloseReason) => {
    if (getOpen()) {
      if (!isControlled) {
        internalOpen = false;
      }
      currentOnOpenChange?.(false, reason);
      handle.update();
    }
  };

  const toggle = (reason: DialogCloseReason = "trigger-press") => {
    if (getOpen()) {
      closeDialog(reason);
    } else {
      openDialog(reason);
    }
  };

  handle.context.set({
    get open() {
      return getOpen();
    },
    modal,
    dismissOnOutsidePress,
    get triggerRef() {
      return triggerRef;
    },
    setTriggerRef,
    get popupRef() {
      return popupRef;
    },
    setPopupRef,
    openDialog,
    closeDialog,
    toggle,
    dialogId,
    get titleId() {
      return titleId;
    },
    setTitleId,
    get descriptionId() {
      return descriptionId;
    },
    setDescriptionId,
  });

  return (props: DialogRootProps) => {
    isControlled = props.open !== undefined;
    controlledOpen = props.open ?? false;
    currentOnOpenChange = props.onOpenChange;

    return <>{props.children}</>;
  };
}

/**
 * Namespace containing all DialogRoot-related types.
 */
export namespace DialogRoot {
  export type Modal = DialogModal;
  export type Setup = DialogRootSetup;
  export type Props = DialogRootProps;
  export type State = DialogRootState;
  export type CloseReason = DialogCloseReason;
  export type ContextValue = DialogRootContextValue;
}
