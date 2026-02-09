import type { Handle, RemixNode } from "@remix-run/component";
import { FieldRoot, type FieldValidityData, type FieldValidityState } from "../root/field-root";

/**
 * Props passed to the FieldValidity render function.
 */
export interface FieldValidityProps {
  children: (state: FieldValidityData & { validity: FieldValidityState }) => RemixNode;
}

/**
 * Render prop component for accessing field validity state.
 * Provides access to the full validity data for custom rendering.
 *
 * @example
 * ```tsx
 * <Field.Root setup={{ name: "email" }}>
 *   <Field.Control type="email" />
 *   <Field.Validity>
 *     {({ valid, error }) => (
 *       <span class={valid ? "text-green" : "text-red"}>
 *         {valid ? "Valid!" : error}
 *       </span>
 *     )}
 *   </Field.Validity>
 * </Field.Root>
 * ```
 */
export function FieldValidity(handle: Handle) {
  const ctx = handle.context.get(FieldRoot);

  return (props: FieldValidityProps) => {
    if (!ctx) return null;

    const validityState = {
      ...ctx.validityData,
      validity: ctx.validityData.state,
    };

    return <>{props.children(validityState)}</>;
  };
}

/**
 * Namespace containing all FieldValidity-related types.
 */
export namespace FieldValidity {
  export type Props = FieldValidityProps;
}
