import type { Handle, RemixNode } from "@remix-run/component";
import { FieldRoot, getFieldStateDataAttributes } from "../root/FieldRoot";
import { generateId } from "../../utils/generate-id";

/**
 * Props passed to the FieldLabel render function.
 */
export interface FieldLabelProps {
  children: RemixNode;
  class?: string;
}

/**
 * Label component for a form field.
 * Renders a `<label>` element that is associated with the field control.
 *
 * @example
 * ```tsx
 * <Field.Root setup={{ name: "email" }}>
 *   <Field.Label>Email Address</Field.Label>
 *   <Field.Control type="email" />
 * </Field.Root>
 * ```
 */
export function FieldLabel(handle: Handle) {
  const ctx = handle.context.get(FieldRoot);
  const id = generateId("field-label");

  if (ctx) {
    ctx.setLabelId(id);
  }

  return (props: FieldLabelProps) => {
    if (!ctx) {
      return (
        <span role="none" class={props.class}>
          {props.children}
        </span>
      );
    }

    const dataAttrs = getFieldStateDataAttributes(ctx.state);

    return (
      <label id={id} htmlFor={ctx.controlId} class={props.class} {...dataAttrs}>
        {props.children}
      </label>
    );
  };
}

/**
 * Namespace containing all FieldLabel-related types.
 */
export namespace FieldLabel {
  export type Props = FieldLabelProps;
}
