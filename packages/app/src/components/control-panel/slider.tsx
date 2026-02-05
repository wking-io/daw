import type { Handle } from "@remix-run/component";
import { Field } from "@daw/ui";
import { cn } from "@daw/utils";

function generateId(): string {
  return `slider-${Math.random().toString(36).slice(2, 9)}`;
}

export function Slider(
  handle: Handle,
  setup: {
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    name?: string;
    disabled?: boolean;
    formatValue?: (value: number) => string;
  },
) {
  const id = generateId();
  const fieldCtx = handle.context.get(Field.Root);

  const name = fieldCtx?.name ?? setup.name;
  const disabled = fieldCtx?.disabled ?? setup.disabled ?? false;
  const formatValue = setup.formatValue ?? ((v: number) => String(v));

  const handleChange = (newValue: number, initialValue: number) => {
    setup.onChange(newValue);

    if (fieldCtx) {
      fieldCtx.setFilled(true);
      fieldCtx.setDirty(newValue !== initialValue);

      if (fieldCtx.validationMode === "onChange") {
        fieldCtx.validate(newValue);
      }
    }
  };

  const handleFocus = () => {
    fieldCtx?.setFocused(true);
  };

  const handleBlur = (value: number) => {
    if (fieldCtx) {
      fieldCtx.setTouched(true);
      fieldCtx.setFocused(false);

      if (fieldCtx.validationMode === "onBlur") {
        fieldCtx.validate(value);
      }
    }
  };

  return (props: { value: number; class?: string }) => {
    const initialValue = props.value;
    const describedBy = fieldCtx
      ? [...fieldCtx.descriptionIds, ...fieldCtx.errorIds].join(" ")
      : undefined;

    // Calculate percentage for styling the track
    const percent = ((props.value - setup.min) / (setup.max - setup.min)) * 100;

    return (
      <div id={id} class={cn("flex flex-col gap-1", props.class)}>
        <div class="flex items-center gap-2">
          <input
            id={fieldCtx?.controlId}
            name={name}
            type="range"
            disabled={disabled}
            min={setup.min}
            max={setup.max}
            step={setup.step}
            value={props.value}
            aria-invalid={fieldCtx?.state.valid === false ? true : undefined}
            aria-describedby={describedBy || undefined}
            class={cn(
              "flex-1 h-1.5 rounded-full appearance-none cursor-pointer",
              "bg-layer-2",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-pointer",
              "[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer",
              disabled && "cursor-not-allowed opacity-50",
            )}
            style={{
              background: `linear-gradient(to right, currentColor ${percent}%, var(--color-layer-2) ${percent}%)`,
            }}
            on={{
              input: (e: Event) => {
                const target = e.target as HTMLInputElement;
                handleChange(Number(target.value), initialValue);
              },
              focus: () => handleFocus(),
              blur: () => handleBlur(props.value),
            }}
          />
          <span class="text-xs tabular-nums font-code min-w-[4ch] text-right">
            {formatValue(props.value)}
          </span>
        </div>
      </div>
    );
  };
}
