import { Atom } from "@daw/atom-remix";
import { getAtom } from "@daw/atom-remix/handlers";
import type { Handle } from "@remix-run/component";
import { ParseResult, Schema } from "effect";
import type {
  CreateFormOptions,
  CreateFormResult,
  FieldGetter,
  FormField,
  FormValues,
  StructFieldsFromSchema,
} from "./types";
import { ulid } from "ulid";

/**
 * Internal state for a single field.
 */
interface FieldState {
  key: number;
  errors: readonly string[];
}

/**
 * Internal state for the entire form.
 */
interface InternalFormState {
  fields: Record<string, FieldState>;
  formErrors: readonly string[];
}

function generateId(prefix: string): string {
  return `${prefix}-${ulid()}`;
}

/**
 * Extract human-readable error messages from Effect Schema ParseError.
 */
function extractErrors(error: ParseResult.ParseError): readonly string[] {
  const formatted = ParseResult.ArrayFormatter.formatErrorSync(error);
  return formatted.map((issue) => issue.message);
}

/**
 * Extract field-specific errors from a ParseError.
 * Returns errors that match the given field path.
 */
function extractFieldErrors(error: ParseResult.ParseError, fieldName: string): readonly string[] {
  const formatted = ParseResult.ArrayFormatter.formatErrorSync(error);
  return formatted
    .filter((issue) => {
      const path = issue.path;
      return path.length > 0 && path[0] === fieldName;
    })
    .map((issue) => issue.message);
}

/**
 * Extract form-level errors (errors not associated with a specific field).
 */
function extractFormLevelErrors(
  error: ParseResult.ParseError,
  fieldNames: readonly string[],
): readonly string[] {
  const formatted = ParseResult.ArrayFormatter.formatErrorSync(error);
  return formatted
    .filter((issue) => {
      const path = issue.path;
      // Form-level errors have empty path or path not matching any field
      if (path.length === 0) return true;
      return !fieldNames.includes(String(path[0]));
    })
    .map((issue) => issue.message);
}

/**
 * Get the field names from a Schema.Struct.
 */
function getFieldNames(schema: { fields: Record<string, unknown> }): readonly string[] {
  return Object.keys(schema.fields);
}

/**
 * Get the schema for a specific field from a Struct schema.
 */
function getFieldSchema(
  schema: { fields: Record<string, unknown> },
  fieldName: string,
): Schema.Schema<unknown, unknown, never> | undefined {
  return schema.fields[fieldName] as Schema.Schema<unknown, unknown, never> | undefined;
}

/**
 * Create a form validation instance.
 *
 * @example
 * ```tsx
 * const MySchema = Schema.Struct({
 *   email: Schema.String.pipe(Schema.nonEmptyString()),
 *   age: Schema.Number.pipe(Schema.positive()),
 * })
 *
 * function MyForm(handle: Handle) {
 *   const [field, form] = createForm(handle, { schema: MySchema })
 *
 *   return () => (
 *     <form>
 *       <input
 *         key={field('email').key}
 *         id={field('email').id}
 *         name={field('email').name}
 *         on={{
 *           blur(e) {
 *             field('email').validate(e.currentTarget.value)
 *             handle.update()
 *           }
 *         }}
 *       />
 *       {field('email').errors.length > 0 && (
 *         <div id={field('email').errorId} role="alert">
 *           {field('email').errors.join(', ')}
 *         </div>
 *       )}
 *     </form>
 *   )
 * }
 * ```
 */
export function createForm<
  S extends Schema.Struct<any>,
>(
  handle: Handle,
  options: CreateFormOptions<S>,
): CreateFormResult<StructFieldsFromSchema<S>>;
export function createForm<
  S extends Schema.Struct<any>,
>(handle: Handle, options: CreateFormOptions<S>): CreateFormResult<StructFieldsFromSchema<S>> {
  const { schema, refinementFields } = options;
  const fieldNames = getFieldNames(schema);

  // Create initial state
  const initialFieldStates: Record<string, FieldState> = {};
  const fieldIds: Record<string, { id: string; errorId: string }> = {};

  for (const name of fieldNames) {
    initialFieldStates[name] = { key: 0, errors: [] };
    fieldIds[name] = {
      id: generateId(`field-${name}`),
      errorId: generateId(`field-${name}-error`),
    };
  }

  const initialState: InternalFormState = {
    fields: initialFieldStates,
    formErrors: [],
  };

  // Create atom for form state
  const formStateAtom = Atom.make(initialState);

  // Get atom accessors
  const [getState, setState] = getAtom(handle, formStateAtom);

  // Cache for lazily created field instances
  const fieldsCache: Record<string, FormField> = {};

  // Creates a field instance for the given name
  function createFieldInstance(name: string): FormField {
    const fieldSchema = getFieldSchema(schema, name);
    const ids = fieldIds[name]!;

    return {
      get id() {
        return ids.id;
      },
      get name() {
        return name;
      },
      get errorId() {
        return ids.errorId;
      },
      get key() {
        return getState().fields[name]!.key;
      },
      get errors() {
        return getState().fields[name]!.errors;
      },
      validate(value): readonly string[] {
        if (!fieldSchema) {
          return [];
        }
        const result = Schema.decodeUnknownEither(fieldSchema)(value);
        let errors: readonly string[] = [];

        if (result._tag === "Left") {
          errors = extractErrors(result.left);
        }

        setState((state: InternalFormState) => ({
          ...state,
          fields: {
            ...state.fields,
            [name]: { key: state.fields[name]!.key, errors },
          },
        }));

        return errors;
      },
      reset(): void {
        setState((state: InternalFormState) => ({
          ...state,
          fields: {
            ...state.fields,
            [name]: { key: state.fields[name]!.key + 1, errors: [] },
          },
        }));
      },
    };
  }

  // Type-safe field getter with autocomplete support
  const field: FieldGetter<StructFieldsFromSchema<S>> = (name) => {
    if (!fieldsCache[name]) {
      fieldsCache[name] = createFieldInstance(name);
    }
    return fieldsCache[name];
  };

  // Create form state object
  const form = {
    get errors() {
      return getState().formErrors;
    },
    get isValid() {
      const state = getState();
      const hasFieldErrors = Object.values(state.fields).some(
        (f: FieldState) => f.errors.length > 0,
      );
      const hasFormErrors = state.formErrors.length > 0;
      return !hasFieldErrors && !hasFormErrors;
    },
    validate(values: FormValues): readonly string[] {
      const decode = Schema.decodeUnknownEither(
        schema as unknown as Schema.Schema<
          Schema.Schema.Type<S>,
          Schema.Schema.Encoded<S>,
          never
        >,
      );
      const result = decode(
        values instanceof FormData ? Object.fromEntries(values.entries()) : values,
      );

      if (result._tag === "Right") {
        // Clear all errors
        setState((state: InternalFormState) => {
          const newFields: Record<string, FieldState> = {};
          for (const name of fieldNames) {
            newFields[name] = { key: state.fields[name]!.key, errors: [] };
          }
          return { fields: newFields, formErrors: [] };
        });
        return [];
      }

      // Extract and distribute errors
      const allErrors: string[] = [];
      const fieldErrorsMap: Record<string, readonly string[]> = {};

      for (const name of fieldNames) {
        fieldErrorsMap[name] = extractFieldErrors(result.left, name);
        allErrors.push(...fieldErrorsMap[name]);
      }

      const formLevelErrors = extractFormLevelErrors(result.left, fieldNames);

      // Handle refinement field mapping
      if (refinementFields) {
        // For now, form-level errors stay at form level
        // Future: map specific refinements to fields based on config
      }

      allErrors.push(...formLevelErrors);

      setState((state: InternalFormState) => {
        const newFields: Record<string, FieldState> = {};
        for (const name of fieldNames) {
          newFields[name] = { key: state.fields[name]!.key, errors: fieldErrorsMap[name] ?? [] };
        }
        return { fields: newFields, formErrors: formLevelErrors };
      });

      return allErrors;
    },
    reset(formElement: HTMLFormElement): void {
      formElement.reset();
      setState((state: InternalFormState) => {
        const newFields = { ...state.fields };
        for (const name of fieldNames) {
          newFields[name] = { key: newFields[name]!.key + 1, errors: [] };
        }
        return { fields: newFields, formErrors: [] };
      });
    },
  };

  return [field, form];
}
