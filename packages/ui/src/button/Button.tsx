import type { Props } from "@remix-run/component";
import { getDataAttributes } from "../utils/data-attributes";

export interface ButtonProps extends Props<"button"> {}

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
export function Button() {
  return (props: ButtonProps) => {
    return (
      <button
        type="button"
        {...getDataAttributes({
          disabled: props.disabled ?? false,
        })}
        {...props}
      />
    );
  };
}

/**
 * Namespace containing all Button-related types.
 */
export namespace Button {
  export type Props = ButtonProps;
}
