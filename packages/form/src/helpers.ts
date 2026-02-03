import type { FormField } from "./types";

/**
 * Props returned by getInputProps for use on input elements.
 */
export interface InputProps {
  readonly id: string;
  readonly name: string;
  readonly "aria-invalid": boolean | undefined;
  readonly "aria-describedby": string | undefined;
}

/**
 * Props returned by getErrorProps for use on error message elements.
 */
export interface ErrorProps {
  readonly id: string;
  readonly role: "alert";
}

/**
 * Get props for an input element from a form field.
 *
 * @example
 * ```tsx
 * <input {...getInputProps(fields.email)} />
 * ```
 */
export function getInputProps<T>(field: FormField<T>): InputProps {
  const hasErrors = field.errors.length > 0;

  return {
    id: field.id,
    name: field.name,
    "aria-invalid": hasErrors ? true : undefined,
    "aria-describedby": hasErrors ? field.errorId : undefined,
  };
}

/**
 * Get props for an error message element from a form field.
 *
 * @example
 * ```tsx
 * {fields.email.errors.length > 0 && (
 *   <div {...getErrorProps(fields.email)}>
 *     {fields.email.errors.join(', ')}
 *   </div>
 * )}
 * ```
 */
export function getErrorProps<T>(field: FormField<T>): ErrorProps {
  return {
    id: field.errorId,
    role: "alert",
  };
}
