import type { Handle, RemixNode } from "@remix-run/component";
import { generateId } from "../../utils/generate-id";
import { getDataAttributes } from "../../utils/data-attributes";

/**
 * Validation mode for field validation.
 */
export type FieldValidationMode = "onSubmit" | "onBlur" | "onChange";

/**
 * Validity state matching native constraint validation API.
 */
export interface FieldValidityState {
  badInput: boolean;
  customError: boolean;
  patternMismatch: boolean;
  rangeOverflow: boolean;
  rangeUnderflow: boolean;
  stepMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
  typeMismatch: boolean;
  valueMissing: boolean;
  valid: boolean | null;
}

/**
 * Data associated with field validity.
 */
export interface FieldValidityData {
  state: FieldValidityState;
  error: string;
  errors: string[];
  value: unknown;
  initialValue: unknown;
}

/**
 * State of the field component.
 */
export interface FieldRootState {
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  valid: boolean | null;
  filled: boolean;
  focused: boolean;
}

/**
 * Setup configuration for the Field component.
 */
export interface FieldRootSetup {
  /**
   * The name attribute for the field control.
   */
  name?: string;
  /**
   * Whether the field is disabled.
   */
  disabled?: boolean;
  /**
   * External invalid state override.
   */
  invalid?: boolean;
  /**
   * When to validate the field.
   * @default "onBlur"
   */
  validationMode?: FieldValidationMode;
  /**
   * Debounce time for validation in milliseconds.
   * @default 0
   */
  validationDebounceTime?: number;
  /**
   * Custom validation function.
   */
  validate?: (value: unknown) => string | string[] | null | Promise<string | string[] | null>;
}

/**
 * Props passed to the Field render function.
 */
export interface FieldRootProps {
  children: RemixNode;
  class?: string;
}

/**
 * Context value provided by FieldRoot.
 */
export interface FieldRootContextValue {
  name: string | undefined;
  disabled: boolean;
  invalid: boolean | undefined;
  touched: boolean;
  dirty: boolean;
  filled: boolean;
  focused: boolean;
  validityData: FieldValidityData;
  state: FieldRootState;
  controlId: string;
  labelId: string | undefined;
  descriptionIds: string[];
  errorIds: string[];
  validationMode: FieldValidationMode;
  validationDebounceTime: number;
  setTouched: (touched: boolean) => void;
  setDirty: (dirty: boolean) => void;
  setFilled: (filled: boolean) => void;
  setFocused: (focused: boolean) => void;
  setValidityData: (data: FieldValidityData) => void;
  setLabelId: (id: string | undefined) => void;
  addDescriptionId: (id: string) => void;
  removeDescriptionId: (id: string) => void;
  addErrorId: (id: string) => void;
  removeErrorId: (id: string) => void;
  validate: (value: unknown) => Promise<void>;
  update: () => void;
}

function createInitialValidityState(): FieldValidityState {
  return {
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valueMissing: false,
    valid: null,
  };
}

function createInitialValidityData(initialValue: unknown): FieldValidityData {
  return {
    state: createInitialValidityState(),
    error: "",
    errors: [],
    value: initialValue,
    initialValue,
  };
}

export function getFieldStateDataAttributes(state: FieldRootState): Record<string, string> {
  return getDataAttributes({
    disabled: state.disabled,
    touched: state.touched,
    dirty: state.dirty,
    valid: state.valid === true,
    invalid: state.valid === false,
    filled: state.filled,
    focused: state.focused,
  });
}

/**
 * Root component for a form field.
 * Provides context for label, control, description, and error components.
 * Renders a `<div>` element.
 *
 * @example
 * ```tsx
 * <Field.Root setup={{ name: "email" }}>
 *   <Field.Label>Email</Field.Label>
 *   <Field.Control type="email" />
 *   <Field.Description>Enter your email address</Field.Description>
 *   <Field.Error>Invalid email</Field.Error>
 * </Field.Root>
 * ```
 */
export function FieldRoot(handle: Handle<FieldRootContextValue>, setup: FieldRootSetup = {}) {
  const controlId = generateId("field-control");
  let labelId: string | undefined;
  let descriptionIds: string[] = [];
  let errorIds: string[] = [];

  let touched = false;
  let dirty = false;
  let filled = false;
  let focused = false;
  let validityData = createInitialValidityData(undefined);

  const getState = (): FieldRootState => ({
    disabled: setup.disabled ?? false,
    touched,
    dirty,
    valid: setup.invalid !== undefined ? !setup.invalid : validityData.state.valid,
    filled,
    focused,
  });

  const validate = async (value: unknown): Promise<void> => {
    const errors: string[] = [];

    if (setup.validate) {
      const result = await setup.validate(value);
      if (result) {
        if (Array.isArray(result)) {
          errors.push(...result);
        } else {
          errors.push(result);
        }
      }
    }

    const newState = { ...createInitialValidityState() };
    if (errors.length > 0) {
      newState.customError = true;
      newState.valid = false;
    } else {
      newState.valid = true;
    }

    validityData = {
      state: newState,
      error: errors[0] ?? "",
      errors,
      value,
      initialValue: validityData.initialValue,
    };

    handle.update();
  };

  const setTouched = (value: boolean) => {
    touched = value;
    handle.update();
  };

  const setDirty = (value: boolean) => {
    dirty = value;
    handle.update();
  };

  const setFilled = (value: boolean) => {
    filled = value;
    handle.update();
  };

  const setFocused = (value: boolean) => {
    focused = value;
    handle.update();
  };

  const setValidityData = (data: FieldValidityData) => {
    validityData = data;
    handle.update();
  };

  const setLabelId = (id: string | undefined) => {
    labelId = id;
  };

  const addDescriptionId = (id: string) => {
    if (!descriptionIds.includes(id)) {
      descriptionIds = [...descriptionIds, id];
    }
  };

  const removeDescriptionId = (id: string) => {
    descriptionIds = descriptionIds.filter((i) => i !== id);
  };

  const addErrorId = (id: string) => {
    if (!errorIds.includes(id)) {
      errorIds = [...errorIds, id];
    }
  };

  const removeErrorId = (id: string) => {
    errorIds = errorIds.filter((i) => i !== id);
  };

  handle.context.set({
    get name() {
      return setup.name;
    },
    get disabled() {
      return setup.disabled ?? false;
    },
    get invalid() {
      return setup.invalid;
    },
    get touched() {
      return touched;
    },
    get dirty() {
      return dirty;
    },
    get filled() {
      return filled;
    },
    get focused() {
      return focused;
    },
    get validityData() {
      return validityData;
    },
    get state() {
      return getState();
    },
    controlId,
    get labelId() {
      return labelId;
    },
    get descriptionIds() {
      return descriptionIds;
    },
    get errorIds() {
      return errorIds;
    },
    get validationMode() {
      return setup.validationMode ?? "onBlur";
    },
    get validationDebounceTime() {
      return setup.validationDebounceTime ?? 0;
    },
    setTouched,
    setDirty,
    setFilled,
    setFocused,
    setValidityData,
    setLabelId,
    addDescriptionId,
    removeDescriptionId,
    addErrorId,
    removeErrorId,
    validate,
    update: () => handle.update(),
  });

  return (props: FieldRootProps) => {
    const state = getState();
    const dataAttrs = getFieldStateDataAttributes(state);

    return (
      <div class={props.class} {...dataAttrs}>
        {props.children}
      </div>
    );
  };
}

/**
 * Namespace containing all FieldRoot-related types.
 */
export namespace FieldRoot {
  export type ValidationMode = FieldValidationMode;
  export type ValidityState = FieldValidityState;
  export type ValidityData = FieldValidityData;
  export type State = FieldRootState;
  export type Setup = FieldRootSetup;
  export type Props = FieldRootProps;
  export type ContextValue = FieldRootContextValue;
}
