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
      <BaseField.Label class={cn("mb-1.5 block text-xs text-foreground-muted", classes)}>
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
      "h-7 w-full px-2.5 py-1.5 text-xs rounded-sm transition text-foreground outline-none text-foreground",
      // Placeholder styling
      "placeholder:text-foreground/40",
      // Disabled state
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "before:pointer-events-none before:absolute before:inset-0 before:rounded-[4px] before:border before:border-sky-5 before:ring-2 before:ring-sky-5/20 before:opacity-0 before:transition focus-visible:before:opacity-100",
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
          "relative bg-layer-2 shadow-recess shadow-foreground/10 dark:shadow-background/40 rounded-sm",
          "before:absolute before:inset-0 before:rounded-sm before:pointer-events-none before:border-[0.5px] before:border-foreground/10 before:dark:border-background/40",
          // Focus ring
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
