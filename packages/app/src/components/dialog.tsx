import type { Handle, Props, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";
import { Dialog as BaseDialog } from "@daw/ui";

/**
 * Styled Dialog Root - provides context for the dialog.
 * Re-exports the headless DialogRoot with no additional styling.
 */
export const DialogRoot = BaseDialog.Root;

/**
 * Styled Dialog Trigger - button that opens the dialog.
 * Re-exports the headless DialogTrigger for custom trigger styling.
 */
export const DialogTrigger = BaseDialog.Trigger;

/**
 * Props passed to the DialogPopup render function.
 */
export interface DialogPopupProps extends BaseDialog.Popup.Props {}

/**
 * Styled Dialog Popup - the main dialog container.
 * Applies button-like styling with layered gradients, borders, and shadows.
 */
export function DialogPopup(_handle: Handle) {
  return (props: DialogPopupProps) => {
    const { children, class: classes, animate, ...rest } = props;

    return (
      <BaseDialog.Popup
        css={{
          "&::backdrop": {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          },
        }}
        {...rest}
      >
        <div
          class={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-100 max-w-[90vw] rounded-lg p-6 transition",
            "bg-layer-2 bg-linear-to-b from-layer-3/30 dark:from-foreground/2 via-layer-2 via-40% to-layer-3/50 dark:to-foreground/5",
            "text-foreground border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10",
            "outline-none bg-clip-padding",
            "relative shadow-recess",
            "after:pointer-events-none after:absolute after:inset-px after:rounded-[7px] after:shadow-highlight after:shadow-layer-3/40 dark:after:shadow-foreground/5 after:transition",
            classes,
          )}
          animate={animate}
        >
          {children}
        </div>
      </BaseDialog.Popup>
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
 * Styled Dialog Description - descriptive text for the dialog.
 */
export function DialogDescription(_handle: Handle, _setup: DialogDescriptionSetup = {}) {
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
export function DialogClose(_handle: Handle) {
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
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Popup: DialogPopup,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};
