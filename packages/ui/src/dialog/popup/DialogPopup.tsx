import type { Handle, Props, RemixNode } from "@remix-run/component";
import { DialogRoot } from "../root/DialogRoot";

/**
 * Setup configuration for the DialogPopup component.
 */
export interface DialogPopupSetup {}

/**
 * Props passed to the DialogPopup render function.
 */
export interface DialogPopupProps extends Props<"div"> {
  children: RemixNode;
  class?: string;
}

/**
 * State of the dialog popup.
 */
export interface DialogPopupState {
  open: boolean;
}

function getPopupDataAttributes(state: DialogPopupState): Record<string, string> {
  return state.open ? { "data-open": "" } : { "data-closed": "" };
}

/**
 * A container for the dialog contents.
 * Renders a `<div>` element.
 *
 * @example
 * ```tsx
 * <Dialog.Root setup={{}}>
 *   <Dialog.Trigger>Open</Dialog.Trigger>
 *   <Dialog.Portal>
 *     <Dialog.Popup>
 *       <Dialog.Title>Title</Dialog.Title>
 *       <Dialog.Description>Description</Dialog.Description>
 *       <Dialog.Close>Close</Dialog.Close>
 *     </Dialog.Popup>
 *   </Dialog.Portal>
 * </Dialog.Root>
 * ```
 */
export function DialogPopup(handle: Handle, _setup: DialogPopupSetup = {}) {
  const ctx = handle.context.get(DialogRoot);

  // Handle escape key for closing the dialog
  if (ctx) {
    handle.on(document, {
      keydown: (event: KeyboardEvent) => {
        if (event.key === "Escape" && ctx.open) {
          event.preventDefault();
          ctx.closeDialog("escape-key");
        }
      },
    });
  }

  // Queue a task to re-render after children (Title, Description) have registered their IDs
  handle.queueTask(() => {
    handle.update();
  });

  return (props: DialogPopupProps) => {
    const { children, class: className, ...rest } = props;

    if (!ctx) {
      return (
        <div role="dialog" class={className} {...rest}>
          {children}
        </div>
      );
    }

    const state: DialogPopupState = {
      open: ctx.open,
    };
    const dataAttrs = getPopupDataAttributes(state);

    return (
      <div
        id={ctx.dialogId}
        role="dialog"
        aria-modal={ctx.modal === true || ctx.modal === "trap-focus" ? true : undefined}
        aria-labelledby={ctx.titleId ?? undefined}
        aria-describedby={ctx.descriptionId ?? undefined}
        tabIndex={-1}
        hidden={!ctx.open}
        class={className}
        connect={(el: HTMLDivElement) => {
          ctx.setPopupRef(el);
          // Focus the dialog when it opens
          if (ctx.open && ctx.modal) {
            handle.queueTask(() => {
              // Focus the first focusable element or the popup itself
              const focusable = el.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
              );
              if (focusable) {
                focusable.focus();
              } else {
                el.focus();
              }
            });
          }
        }}
        on={{
          click: (event: MouseEvent) => {
            // Prevent clicks inside the popup from closing via backdrop
            event.stopPropagation();
          },
        }}
        {...dataAttrs}
        {...rest}
      >
        {children}
      </div>
    );
  };
}

/**
 * Namespace containing all DialogPopup-related types.
 */
export namespace DialogPopup {
  export type Setup = DialogPopupSetup;
  export type Props = DialogPopupProps;
  export type State = DialogPopupState;
}
