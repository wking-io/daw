import type { Handle } from "@remix-run/component";
import { cn } from "../../utils/cn";
import { FieldRoot } from "../ui/field";

function generateId(): string {
	return `select-${Math.random().toString(36).slice(2, 9)}`;
}

export function Select(
	handle: Handle,
	setup: {
		onChange: (value: string) => void;
		options: string[];
		name?: string;
		disabled?: boolean;
		defaultValue?: string;
	},
) {
	const id = generateId();
	const fieldCtx = handle.context.get(FieldRoot);

	const name = fieldCtx?.name ?? setup.name;
	const disabled = fieldCtx?.disabled ?? setup.disabled ?? false;

	const prevOption = (options: string[], value: string): string => {
		const index = options.indexOf(value);
		return options[index - 1] ?? options[options.length - 1] ?? value;
	};

	const nextOption = (options: string[], value: string): string => {
		const index = options.indexOf(value);
		return options[index + 1] ?? options[0] ?? value;
	};

	const handleChange = (newValue: string, initialValue: string) => {
		setup.onChange(newValue);

		if (fieldCtx) {
			fieldCtx.setFilled(newValue !== "");
			fieldCtx.setDirty(newValue !== initialValue);

			if (fieldCtx.validationMode === "onChange") {
				fieldCtx.validate(newValue);
			}
		}
	};

	const handleFocus = () => {
		fieldCtx?.setFocused(true);
	};

	const handleBlur = (value: string) => {
		if (fieldCtx) {
			fieldCtx.setTouched(true);
			fieldCtx.setFocused(false);

			if (fieldCtx.validationMode === "onBlur") {
				fieldCtx.validate(value);
			}
		}
	};

	return (props: { value: string; class?: string }) => {
		const initialValue = setup.defaultValue ?? props.value;
		const describedBy = fieldCtx
			? [...fieldCtx.descriptionIds, ...fieldCtx.errorIds].join(" ")
			: undefined;

		return (
			<div
				id={id}
				class={cn(
					"flex focus-within:ring-2 focus-within:ring-blue-500/50 rounded-md",
					props.class,
				)}
			>
				<button
					tabindex={-1}
					type="button"
					disabled={disabled}
					on={{
						click: () =>
							handleChange(
								prevOption(setup.options, props.value),
								initialValue,
							),
					}}
					class={cn(
						"border-foreground bg-layer-2 text-foreground flex size-6 items-center justify-center border bg-clip-padding select-none rounded-l-md",
						disabled
							? "cursor-not-allowed opacity-50"
							: "hover:bg-layer-2 active:bg-layer-2",
					)}
				>
					<ChevronIcon class="h-auto w-3 rotate-180" />
				</button>
				<input
					id={fieldCtx?.controlId}
					name={name}
					disabled={disabled}
					aria-invalid={fieldCtx?.state.valid === false ? true : undefined}
					aria-describedby={describedBy || undefined}
					readOnly={true}
					class={cn(
						"border-foreground bg-layer font-code text-foreground focus:ring-0 focus:outline-none h-6 flex-1 border-x-0 border-t border-b text-center text-xs font-extralight tabular-nums focus:z-1 focus:outline focus:-outline-offset-1",
						disabled && "cursor-not-allowed opacity-50",
					)}
					value={props.value}
					on={{
						keydown: (e: KeyboardEvent) => {
							if (e.key === "ArrowLeft") {
								handleChange(
									prevOption(setup.options, props.value),
									initialValue,
								);
							} else if (e.key === "ArrowRight") {
								handleChange(
									nextOption(setup.options, props.value),
									initialValue,
								);
							}
						},
						focus: () => handleFocus(),
						blur: (e) => handleBlur(e.currentTarget.value),
					}}
				/>
				<button
					tabindex={-1}
					type="button"
					disabled={disabled}
					on={{
						click: () =>
							handleChange(
								nextOption(setup.options, props.value),
								initialValue,
							),
					}}
					class={cn(
						"border-foreground bg-layer text-foreground flex size-6 items-center justify-center border bg-clip-padding select-none rounded-r-md",
						disabled
							? "cursor-not-allowed opacity-50"
							: "hover:bg-layer-2 active:bg-layer-2",
					)}
				>
					<ChevronIcon class="h-auto w-3" />
				</button>
			</div>
		);
	};
}

function ChevronIcon(_handle: Handle) {
	return (props: { class: string }) => (
		<svg
			width="16"
			height="15"
			viewBox="0 0 16 15"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			class={props.class}
			aria-hidden="true"
		>
			<path
				d="M6 13V12H7V11H8V10H9V9H10V8H11V7H10V6H9V5H8V4H7V3H6V2H5V1H7V2H8V3H9V4H10V5H11V6H12V7H13V8H12V9H11V10H10V11H9V12H8V13H7V14H5V13H6Z"
				fill="currentColor"
			/>
		</svg>
	);
}
