import type { Handle, RemixNode } from "@remix-run/component";
import { FieldRoot, getFieldStateDataAttributes } from "../root/field-root";
import { generateId } from "../../utils/generate-id";

/**
 * Props passed to the FieldDescription render function.
 */
export interface FieldDescriptionProps {
  children: RemixNode;
  class?: string;
}

/**
 * Description component for a form field.
 * Renders a `<p>` element that provides additional context.
 * Automatically associated with the field control via aria-describedby.
 *
 * @example
 * ```tsx
 * <Field.Root setup={{ name: "password" }}>
 *   <Field.Label>Password</Field.Label>
 *   <Field.Control type="password" />
 *   <Field.Description>Must be at least 8 characters</Field.Description>
 * </Field.Root>
 * ```
 */
export function FieldDescription(handle: Handle) {
  const ctx = handle.context.get(FieldRoot);
  const id = generateId("field-description");

  if (ctx) {
    ctx.addDescriptionId(id);
    handle.signal.addEventListener("abort", () => {
      ctx.removeDescriptionId(id);
    });
  }

  return (props: FieldDescriptionProps) => {
    if (!ctx) return <p class={props.class}>{props.children}</p>;

    const dataAttrs = getFieldStateDataAttributes(ctx.state);

    return (
      <p id={id} class={props.class} {...dataAttrs}>
        {props.children}
      </p>
    );
  };
}

/**
 * Namespace containing all FieldDescription-related types.
 */
export namespace FieldDescription {
  export type Props = FieldDescriptionProps;
}
