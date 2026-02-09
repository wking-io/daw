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
          "fixed left-1/2 top-2 -translate-x-1/2 bg-transparent shadow-recess rounded-[9px] focus-visible:ring-2 focus-visible:ring-sky-5/20 outline-none focus-visible:border-sky-5 border border-transparent no-drag",
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
          "w-100 max-w-[90vw] shadow-layer-4/30 dark:shadow-foreground/5 rounded-lg",
          "bg-layer-2 shadow-highlight text-foreground bg-clip-padding",
          "after:absolute after:pointer-events-none after:inset-0 after:rounded-lg after:shadow-lg after:shadow-oatmeal-13/5 after:dark:shadow-oatmeal-13/10",
          classes,
        )}
        {...rest}
      />
    );
  };
}

export interface DialogBodyProps extends Props<"div"> {}
export function DialogBody() {
  return (props: DialogBodyProps) => {
    const { class: classes, ...rest } = props;
    return (
      <div
        class={cn(
          "w-full rounded-lg p-3 relative",
          "bg-layer-3 bg-linear-to-b from-layer-4/30 dark:from-foreground/2 via-layer-3 via-40% to-layer-4/50 dark:to-foreground/5",
          "text-foreground border border-oatmeal-13/15 shadow-input shadow-oatmeal-13/5 dark:shadow-oatmeal-13/10",
          "outline-none bg-clip-padding",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[7px] after:shadow-highlight after:shadow-layer-4 dark:after:shadow-foreground/5 after:transition",
          classes,
        )}
        {...rest}
      />
    );
  };
}

export interface DialogHeaderProps extends Props<"div"> {}
export function DialogHeader() {
  return (props: DialogHeaderProps) => {
    const { class: classes, ...rest } = props;
    return <div class={cn("py-2 px-3 flex gap-1", classes)} {...rest} />;
  };
}

export interface DialogFooterProps extends Props<"div"> {}
export function DialogFooter() {
  return (props: DialogFooterProps) => {
    const { class: classes, ...rest } = props;
    return <div class={cn("py-2 px-3 flex flex-row-reverse gap-1", classes)} {...rest} />;
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
        class={cn("text-xxs uppercase tracking-wide text-foreground-muted", classes)}
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
        aria-label="close dialog"
        class={cn(
          "cursor-pointer rounded-sm size-5 -m-1 flex items-center justify-center text-sm transition duration-150 text-foreground-muted",
          "",
          "hover:bg-layer-3 hover:shadow-sm hover:text-foreground",
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
  Body: DialogBody,
  Header: DialogHeader,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};
