import type { Handle, Props, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";
import { Button as BaseButton } from "@daw/ui";

/**
 * Size variants for the Button component.
 */
export type ButtonSize = "xs" | "sm" | "default";

/**
 * Setup configuration for the Button component.
 * Passed during component initialization.
 */
export interface ButtonSetup {
  /**
   * The size variant of the button.
   * @default "default"
   */
  size?: ButtonSize;
  /**
   * Whether the button is disabled.
   * @default false
   */
  disabled?: boolean;
}

/**
 * Props passed to the Button render function.
 */
export interface ButtonProps extends Props<"button"> {
  /**
   * The content to render inside the button.
   */
  children: RemixNode;
  /**
   * Additional CSS classes to apply to the button.
   */
  class?: string;
}

const sizeClasses: Record<
  ButtonSize,
  { button: string; wrapper: string; wrapperBefore: string; wrapperAfter: string }
> = {
  xs: {
    button: "text-xs py-1 px-2 rounded-sm",
    wrapper: "rounded-[4px]",
    wrapperBefore: "before:rounded-[4px]",
    wrapperAfter: "after:rounded-[3px]",
  },
  sm: {
    button: "text-xs py-1.5 px-3 rounded-sm",
    wrapper: "rounded-[4px]",
    wrapperBefore: "before:rounded-[4px]",
    wrapperAfter: "after:rounded-[3px]",
  },
  default: {
    button: "text-sm py-2 px-3.5 rounded-lg",
    wrapper: "rounded-[8px]",
    wrapperBefore: "before:rounded-[8px]",
    wrapperAfter: "after:rounded-[7px]",
  },
};

/**
 * A styled button component with multiple size variants.
 * Renders a `<button>` element wrapped in a styled container.
 *
 * @example
 * ```tsx
 * <Button setup={{ size: "sm" }}>
 *   Click me
 * </Button>
 * ```
 */
export function Button(_handle: Handle, setup: ButtonSetup = {}) {
  const size = setup.size ?? "default";
  const setupDisabled = setup.disabled ?? false;

  return (props: ButtonProps) => {
    const { children, class: classes, disabled: propsDisabled, ...buttonProps } = props;
    const disabled = propsDisabled ?? setupDisabled;
    const sizes = sizeClasses[size];

    return (
      <div
        class={cn(
          "relative bg-layer-1 shadow-recess before:pointer-events-none before:absolute before:inset-0 before:border before:border-sky-5 before:ring-2 before:ring-sky-5/20 before:opacity-0 before:transition focus-within:before:opacity-100 after:pointer-events-none after:absolute after:inset-px after:shadow-highlight after:shadow-layer-3/40 dark:after:shadow-foreground/5 after:transition",
          sizes.wrapper,
          sizes.wrapperBefore,
          sizes.wrapperAfter,
        )}
      >
        <BaseButton
          disabled={disabled}
          class={cn(
            "block transition cursor-pointer bg-layer-2 bg-linear-to-b from-layer-3/30 dark:from-foreground/2 via-layer-2 via-40% to-layer-3/50 dark:to-foreground/5 text-foreground border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 outline-none bg-clip-padding",
            "active:from-layer-1/30 active:via-layer-1/5 active:to-layer-1/15 active:dark:from-layer-1/30 active:dark:via-layer-1/0 active:dark:to-layer-1/15",
            sizes.button,
            "disabled:opacity-50 disabled:cursor-not-allowed",
            classes,
          )}
          {...buttonProps}
        >
          {children}
        </BaseButton>
      </div>
    );
  };
}
