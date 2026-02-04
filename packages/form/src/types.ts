import type { Schema } from "effect";

/**
 * A form field with validation capabilities.
 */
export interface FormField<T = unknown> {
  /** Unique ID for the input element */
  readonly id: string;
  /** Field name (matches schema key) */
  readonly name: string;
  /** Unique ID for the error element */
  readonly errorId: string;
  /** Key that changes on reset to force re-mount */
  readonly key: number;
  /** Array of error messages from last validation */
  readonly errors: readonly string[];
  /** Validate the field with a value, updates errors, returns error array */
  readonly validate: (value: T) => readonly string[];
  /** Reset the field - clears errors and increments key */
  readonly reset: () => void;
}

/**
 * Form-level state and methods.
 */

export type FormValues = Record<string, unknown> | FormData;
export interface FormState {
  /** Form-level errors (from cross-field validation) */
  readonly errors: readonly string[];
  /** Whether all fields and form-level validation passed */
  readonly isValid: boolean;
  /** Validate all fields and form-level rules */
  readonly validate: (valRes: FormValues) => readonly string[];
  /** Reset form using native form reset + clear all errors */
  readonly reset: (formElement: HTMLFormElement) => void;
}

/**
 * Options for createForm.
 * The schema must have no context requirements (all fields must be context-free).
 */
export type StructFieldsFromSchema<S> = S extends Schema.Struct<infer Fields> ? Fields : never;

export interface CreateFormOptions<
  S extends Schema.Struct<any>,
> {
  /** Effect Schema defining the form structure and validation rules */
  readonly schema: S;
  /**
   * Cross-field validation errors can be assigned to a specific field.
   * Map from refinement index to field name.
   */
  readonly refinementFields?: Partial<Record<number, string>>;
}

/**
 * A function that returns a typed field by name.
 * Provides autocomplete for valid field names and full type safety.
 */
export type FieldGetter<Fields extends Schema.Struct.Fields> = <K extends keyof Fields & string>(
  name: K,
) => FormField<Schema.Schema.Type<Fields[K]>>;

/**
 * Result tuple from createForm: [field, form]
 */
export type CreateFormResult<Fields extends Schema.Struct.Fields> = readonly [
  field: FieldGetter<Fields>,
  form: FormState,
];
