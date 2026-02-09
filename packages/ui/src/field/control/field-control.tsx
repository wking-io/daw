import type { Handle } from "@remix-run/component";
import { FieldRoot, getFieldStateDataAttributes } from "../root/field-root";

/**
 * Props passed to the FieldControl render function.
 */
type InputType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "tel"
  | "url"
  | "search"
  | "date"
  | "time"
  | "datetime-local"
  | "month"
  | "week"
  | "color"
  | "file"
  | "hidden"
  | "checkbox"
  | "radio"
  | "range"
  | "submit"
  | "reset"
  | "button"
  | "image";

export interface FieldControlProps {
  class?: string;
  type?: InputType;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  pattern?: string;
  readOnly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}

/**
 * Input control component for a form field.
 * Renders an `<input>` element with automatic validation and state management.
 *
 * @example
 * ```tsx
 * <Field.Root setup={{ name: "email" }}>
 *   <Field.Label>Email</Field.Label>
 *   <Field.Control type="email" placeholder="Enter email" />
 * </Field.Root>
 * ```
 */
export function FieldControl(handle: Handle) {
  const ctx = handle.context.get(FieldRoot);
  let inputRef: HTMLInputElement | undefined;

  const handleChange = (value: string) => {
    if (!ctx) return;

    const wasFilled = ctx.filled;
    const isFilled = value !== "";

    if (isFilled !== wasFilled) {
      ctx.setFilled(isFilled);
    }

    if (!ctx.dirty && value !== ctx.validityData.initialValue) {
      ctx.setDirty(true);
    }

    if (ctx.validationMode === "onChange") {
      ctx.validate(value);
    }
  };

  const handleBlur = () => {
    if (!ctx) return;

    if (!ctx.touched) {
      ctx.setTouched(true);
    }

    ctx.setFocused(false);

    if (ctx.validationMode === "onBlur" && inputRef) {
      ctx.validate(inputRef.value);
    }
  };

  const handleFocus = () => {
    if (!ctx) return;
    ctx.setFocused(true);
  };

  return (props: FieldControlProps) => {
    const {
      class: classes,
      type = "text",
      placeholder,
      value,
      defaultValue,
      required,
      minLength,
      maxLength,
      min,
      max,
      pattern,
      readOnly,
      autoComplete,
      autoFocus,
    } = props;

    // Render a simple input when outside of Field context
    if (!ctx) {
      return (
        <input
          type="text"
          class={classes}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          min={min}
          max={max}
          pattern={pattern}
          readOnly={readOnly}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
      );
    }

    const dataAttrs = getFieldStateDataAttributes(ctx.state);
    const describedBy = [...ctx.descriptionIds, ...ctx.errorIds].join(" ");

    // Render input based on type - using switch to satisfy strict type checking
    const renderInput = () => {
      const commonProps = {
        id: ctx.controlId,
        name: ctx.name,
        disabled: ctx.disabled,
        "aria-invalid": ctx.state.valid === false ? true : undefined,
        "aria-describedby": describedBy || undefined,
        class: classes,
        placeholder,
        value,
        defaultValue,
        required,
        minLength,
        maxLength,
        min,
        max,
        pattern,
        readOnly,
        autoComplete,
        autoFocus,
        connect: (el: HTMLInputElement) => {
          inputRef = el;
        },
        on: {
          input: (e: Event & { currentTarget: HTMLInputElement }) =>
            handleChange(e.currentTarget.value),
          blur: () => handleBlur(),
          focus: () => handleFocus(),
        },
        ...dataAttrs,
      };

      switch (type) {
        case "email":
          return <input type="email" {...commonProps} />;
        case "password":
          return <input type="password" {...commonProps} />;
        case "number":
          return <input type="number" {...commonProps} />;
        case "tel":
          return <input type="tel" {...commonProps} />;
        case "url":
          return <input type="url" {...commonProps} />;
        case "search":
          return <input type="search" {...commonProps} />;
        case "date":
          return <input type="date" {...commonProps} />;
        case "time":
          return <input type="time" {...commonProps} />;
        case "datetime-local":
          return <input type="datetime-local" {...commonProps} />;
        case "month":
          return <input type="month" {...commonProps} />;
        case "week":
          return <input type="week" {...commonProps} />;
        case "color":
          return <input type="color" {...commonProps} />;
        case "file":
          return <input type="file" {...commonProps} />;
        case "hidden":
          return <input type="hidden" {...commonProps} />;
        case "checkbox":
          return <input type="checkbox" {...commonProps} />;
        case "radio":
          return <input type="radio" {...commonProps} />;
        case "range":
          return <input type="range" {...commonProps} />;
        case "text":
        default:
          return <input type="text" {...commonProps} />;
      }
    };

    return renderInput();
  };
}

/**
 * Namespace containing all FieldControl-related types.
 */
export namespace FieldControl {
  export type Props = FieldControlProps;
}
