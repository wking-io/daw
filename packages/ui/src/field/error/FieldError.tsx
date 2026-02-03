import type { Handle, RemixNode } from "@remix-run/component";
import { FieldRoot, type FieldValidityState, getFieldStateDataAttributes } from "../root/FieldRoot";
import { generateId } from "../../utils/generate-id";

/**
 * Props passed to the FieldError render function.
 */
export interface FieldErrorProps {
  children?: RemixNode;
  class?: string;
  /**
   * When to show the error.
   * - `true`: Always show
   * - `false`: Never show
   * - `keyof FieldValidityState`: Show when that validity condition is met
   */
  match?: boolean | keyof FieldValidityState;
  /**
   * Force show the error regardless of validity state.
   */
  forceShow?: boolean;
}

/**
 * Error message component for a form field.
 * Renders a `<div>` element with role="alert" when validation fails.
 * Automatically associated with the field control via aria-describedby.
 *
 * @example
 * ```tsx
 * <Field.Root setup={{ name: "email", validate: validateEmail }}>
 *   <Field.Label>Email</Field.Label>
 *   <Field.Control type="email" />
 *   <Field.Error>Please enter a valid email</Field.Error>
 * </Field.Root>
 * ```
 */
export function FieldError(handle: Handle) {
  const ctx = handle.context.get(FieldRoot);
  const id = generateId("field-error");

  if (ctx) {
    ctx.addErrorId(id);
    handle.signal.addEventListener("abort", () => {
      ctx.removeErrorId(id);
    });
  }

  return (props: FieldErrorProps) => {
    if (!ctx) return null;

    const { match, forceShow, children, class: className } = props;
    const { validityData, state } = ctx;

    let shouldRender = false;

    if (forceShow || match === true) {
      shouldRender = true;
    } else if (match === false) {
      shouldRender = false;
    } else if (typeof match === "string") {
      shouldRender = validityData.state[match] ?? false;
    } else {
      shouldRender = validityData.state.valid === false;
    }

    if (!shouldRender) return null;

    const dataAttrs = getFieldStateDataAttributes(state);
    const errorContent =
      children ??
      (validityData.errors.length > 1 ? (
        <ul>
          {validityData.errors.map((error) => (
            <li>{error}</li>
          ))}
        </ul>
      ) : (
        validityData.error
      ));

    return (
      <div id={id} role="alert" class={className} {...dataAttrs}>
        {errorContent}
      </div>
    );
  };
}

/**
 * Namespace containing all FieldError-related types.
 */
export namespace FieldError {
  export type Props = FieldErrorProps;
}
