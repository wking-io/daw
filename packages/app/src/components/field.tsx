import type { Handle, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";
import { Field as BaseField } from "@daw/ui";

/**
 * Re-export the headless FieldRoot component.
 */
export const FieldRoot = BaseField.Root;

/**
 * Props passed to the FieldLabel render function.
 */
export interface FieldLabelProps {
  children: RemixNode;
  class?: string;
}

/**
 * Styled Field Label - label for form inputs.
 */
export function FieldLabel(_handle: Handle) {
  return (props: FieldLabelProps) => {
    const { children, class: classes } = props;

    return (
      <BaseField.Label class={cn("mb-1.5 block text-sm text-foreground/70", classes)}>
        {children}
      </BaseField.Label>
    );
  };
}

/**
 * Props passed to the FieldControl render function.
 */
export interface FieldControlProps {
  class?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autoFocus?: boolean;
  name?: string;
  connect?: (input: HTMLInputElement) => void;
  on?: {
    blur?: (e: FocusEvent & { currentTarget: HTMLInputElement }) => void;
    focus?: (e: FocusEvent & { currentTarget: HTMLInputElement }) => void;
    input?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    change?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  };
}

/**
 * Styled Field Control - input element with button-like styling.
 */
export function FieldControl(_handle: Handle) {
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
      autoFocus,
      name,
      connect,
      on,
    } = props;

    const inputClasses = cn(
      "box-border w-full px-3 py-2.5 text-sm rounded-sm transition",
      // Button-like background and styling
      "bg-layer-2 bg-linear-to-b from-layer-3/30 dark:from-foreground/2 via-layer-2 via-40% to-layer-3/50 dark:to-foreground/5",
      "text-foreground border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10",
      "outline-none bg-clip-padding",
      // Placeholder styling
      "placeholder:text-foreground/40",
      // Disabled state
      "disabled:opacity-50 disabled:cursor-not-allowed",
      classes,
    );

    const renderInput = () => {
      const commonProps = {
        name,
        placeholder,
        value,
        defaultValue,
        required,
        minLength,
        maxLength,
        autoFocus,
        class: inputClasses,
        connect,
        on,
      };

      // Handle each type explicitly to satisfy strict type checking
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
        default:
          return <input type="text" {...commonProps} />;
      }
    };

    return (
      <div
        class={cn(
          // Wrapper with recess shadow (similar to Button wrapper)
          "relative bg-layer-1 shadow-recess rounded-[4px]",
          // Focus ring
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[4px] before:border before:border-sky-5 before:ring-2 before:ring-sky-5/20 before:opacity-0 before:transition focus-within:before:opacity-100",
          // Inner highlight
          "after:pointer-events-none after:absolute after:inset-px after:rounded-[3px] after:shadow-highlight after:shadow-layer-3/40 dark:after:shadow-foreground/5 after:transition",
        )}
      >
        {renderInput()}
      </div>
    );
  };
}

/**
 * Props passed to the FieldError render function.
 */
export interface FieldErrorProps {
  children?: RemixNode;
  class?: string;
}

/**
 * Styled Field Error - error message display.
 */
export function FieldError(_handle: Handle) {
  return (props: FieldErrorProps) => {
    const { children, class: classes } = props;

    return (
      <BaseField.Error
        class={cn(
          "mt-2 rounded-sm border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400",
          classes,
        )}
      >
        {children}
      </BaseField.Error>
    );
  };
}

/**
 * Props passed to the FieldDescription render function.
 */
export interface FieldDescriptionProps {
  children: RemixNode;
  class?: string;
}

/**
 * Styled Field Description - help text for form inputs.
 */
export function FieldDescription(_handle: Handle) {
  return (props: FieldDescriptionProps) => {
    const { children, class: classes } = props;

    return (
      <BaseField.Description class={cn("mt-1.5 text-xs text-foreground/50", classes)}>
        {children}
      </BaseField.Description>
    );
  };
}

/**
 * Namespace containing all Field components.
 */
export const Field = {
  Root: FieldRoot,
  Label: FieldLabel,
  Control: FieldControl,
  Error: FieldError,
  Description: FieldDescription,
};
