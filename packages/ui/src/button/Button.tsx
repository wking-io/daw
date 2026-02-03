import type { Handle, Props, RemixNode } from "@remix-run/component";
import { ButtonDataAttributes } from "./ButtonDataAttributes";

/**
 * Setup configuration for the Button component.
 * Passed during component initialization.
 */
export interface ButtonSetup {
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

/**
 * State exposed by the Button component.
 */
export interface ButtonState {
  /**
   * Whether the button is disabled.
   */
  disabled: boolean;
}

/**
 * A headless button component with data attributes for styling.
 * Renders a `<button>` element with data attributes for disabled state.
 * Use this as a base for styled button implementations.
 *
 * Data attributes applied:
 * - `data-disabled`: Present when the button is disabled
 *
 * @example
 * ```tsx
 * <Button setup={{}}>
 *   Click me
 * </Button>
 * ```
 */
export function Button(_handle: Handle, setup: ButtonSetup = {}) {
  const setupDisabled = setup.disabled ?? false;

  return (props: ButtonProps) => {
    const { children, class: className, disabled: propsDisabled, ...buttonProps } = props;
    const disabled = propsDisabled ?? setupDisabled;

    return (
      <button
        type="button"
        disabled={disabled}
        class={className}
        {...(disabled ? { [ButtonDataAttributes.disabled]: "" } : {})}
        {...buttonProps}
      >
        {children}
      </button>
    );
  };
}

/**
 * Namespace containing all Button-related types.
 */
export namespace Button {
  export type Setup = ButtonSetup;
  export type Props = ButtonProps;
  export type State = ButtonState;
}
