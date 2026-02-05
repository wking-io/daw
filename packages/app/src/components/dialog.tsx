import type { Handle, Props } from "@remix-run/component";
import { cn } from "@daw/utils";
import { Dialog as BaseDialog } from "@daw/ui";

/**
 * Props passed to the DialogPopup render function.
 */
export interface DialogPortalProps extends BaseDialog.Popup.Props {}

/**
 * Styled Dialog Popup - the main dialog container.
 * Applies button-like styling with layered gradients, borders, and shadows.
 */
export function DialogPortal(_handle: Handle) {
  return (props: DialogPortalProps) => {
    const { class: classes, ...rest } = props;

    return (
      <BaseDialog.Popup
        class={cn(
          "fixed left-1/2 top-2 -translate-x-1/2 bg-transparent shadow-recess rounded-lg",
          classes,
        )}
        {...rest}
      />
    );
  };
}

export interface DialogPopupProps extends Props<"div"> {}
export function DialogPopup() {
  return (props: DialogPopupProps) => {
    const { class: classes, ...rest } = props;
    return (
      <div
        class={cn(
          "w-100 max-w-[90vw] rounded-lg p-6",
          "bg-layer-2 bg-linear-to-b from-layer-3/30 dark:from-foreground/2 via-layer-2 via-40% to-layer-3/50 dark:to-foreground/5",
          "text-foreground border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10",
          "outline-none bg-clip-padding",
          "after:pointer-events-none after:absolute after:inset-px after:rounded-[7px] after:shadow-highlight after:shadow-layer-3/40 dark:after:shadow-foreground/5 after:transition",
          classes,
        )}
        {...rest}
      />
    );
  };
}

/**
 * Props passed to the DialogTitle render function.
 */
export interface DialogTitleProps extends BaseDialog.Title.Props {}

/**
 * Styled Dialog Title - heading for the dialog.
 */
export function DialogTitle() {
  return (props: DialogTitleProps) => {
    const { class: classes, ...rest } = props;

    return (
      <BaseDialog.Title
        class={cn("m-0 mb-4 text-lg font-medium text-foreground", classes)}
        {...rest}
      />
    );
  };
}

export interface DialogDescriptionProps extends BaseDialog.Description.Props {}

/**
 * Styled Dialog Description - descriptive text for the dialog.
 */
export function DialogDescription() {
  return (props: DialogDescriptionProps) => {
    const { class: classes, ...rest } = props;

    return <BaseDialog.Description class={cn("text-sm text-foreground/70", classes)} {...rest} />;
  };
}

export interface DialogCloseProps extends BaseDialog.Close.Props {}

/**
 * Styled Dialog Close - button that closes the dialog.
 * Applies secondary button styling.
 */
export function DialogClose() {
  return (props: DialogCloseProps) => {
    const { class: classes, ...rest } = props;

    return (
      <BaseDialog.Close
        class={cn(
          "cursor-pointer rounded-sm px-4 py-2 text-sm transition",
          "border border-oatmeal-12/15 bg-transparent text-foreground/70",
          "hover:bg-layer-3/50 hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          classes,
        )}
        {...rest}
      />
    );
  };
}

/**
 * Namespace containing all Dialog components.
 */
export const Dialog = {
  Root: BaseDialog.Root,
  Trigger: BaseDialog.Trigger,
  Portal: DialogPortal,
  Popup: DialogPopup,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};
