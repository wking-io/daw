import type { Handle, Props, RemixNode } from "@remix-run/component";

export type ValidationMode = "onSubmit" | "onBlur" | "onChange";

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

export interface FieldValidityData {
	state: FieldValidityState;
	error: string;
	errors: string[];
	value: unknown;
	initialValue: unknown;
}

export interface FieldState {
	disabled: boolean;
	touched: boolean;
	dirty: boolean;
	valid: boolean | null;
	filled: boolean;
	focused: boolean;
}

export interface FieldContextValue {
	name: string | undefined;
	disabled: boolean;
	invalid: boolean | undefined;
	touched: boolean;
	dirty: boolean;
	filled: boolean;
	focused: boolean;
	validityData: FieldValidityData;
	state: FieldState;
	controlId: string;
	labelId: string | undefined;
	descriptionIds: string[];
	errorIds: string[];
	validationMode: ValidationMode;
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

function generateId(prefix: string): string {
	return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
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

function getStateDataAttributes(state: FieldState): Record<string, string> {
	const attrs: Record<string, string> = {};
	if (state.disabled) attrs["data-disabled"] = "";
	if (state.touched) attrs["data-touched"] = "";
	if (state.dirty) attrs["data-dirty"] = "";
	if (state.valid === true) attrs["data-valid"] = "";
	if (state.valid === false) attrs["data-invalid"] = "";
	if (state.filled) attrs["data-filled"] = "";
	if (state.focused) attrs["data-focused"] = "";
	return attrs;
}

export function FieldRoot(
	handle: Handle<FieldContextValue>,
	setup: {
		name?: string;
		disabled?: boolean;
		invalid?: boolean;
		validationMode?: ValidationMode;
		validationDebounceTime?: number;
		validate?: (
			value: unknown,
		) => string | string[] | null | Promise<string | string[] | null>;
	},
) {
	const controlId = generateId("field-control");
	let labelId: string | undefined;
	let descriptionIds: string[] = [];
	let errorIds: string[] = [];

	let touched = false;
	let dirty = false;
	let filled = false;
	let focused = false;
	let validityData = createInitialValidityData(undefined);

	const getState = (): FieldState => ({
		disabled: setup.disabled ?? false,
		touched,
		dirty,
		valid:
			setup.invalid !== undefined ? !setup.invalid : validityData.state.valid,
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

	return (props: { children: RemixNode; class?: string }) => {
		const state = getState();
		const dataAttrs = getStateDataAttributes(state);

		return (
			<div class={props.class} {...dataAttrs}>
				{props.children}
			</div>
		);
	};
}

export function FieldLabel(handle: Handle) {
	const ctx = handle.context.get(FieldRoot);
	const id = generateId("field-label");

	if (ctx) {
		ctx.setLabelId(id);
	}

	return (props: { children: RemixNode; class?: string }) => {
		if (!ctx) {
			return (
				<span role="none" class={props.class}>
					{props.children}
				</span>
			);
		}

		const dataAttrs = getStateDataAttributes(ctx.state);

		return (
			<label id={id} htmlFor={ctx.controlId} class={props.class} {...dataAttrs}>
				{props.children}
			</label>
		);
	};
}

export function FieldControl(handle: Handle) {
	const ctx = handle.context.get(FieldRoot);
	let inputRef: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

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

		if (ctx.validationMode === "onBlur") {
			const value =
				inputRef instanceof HTMLInputElement ||
				inputRef instanceof HTMLTextAreaElement
					? inputRef.value
					: (inputRef as HTMLSelectElement).value;
			ctx.validate(value);
		}
	};

	const handleFocus = () => {
		if (!ctx) return;
		ctx.setFocused(true);
	};

	return (
		props: Props<"input"> & {
			class?: string;
		},
	) => {
		const { class: className, ...inputProps } = props;

		if (!ctx) {
			return <input class={className} {...inputProps} />;
		}

		const dataAttrs = getStateDataAttributes(ctx.state);
		const describedBy = [...ctx.descriptionIds, ...ctx.errorIds].join(" ");

		return (
			<input
				id={ctx.controlId}
				name={ctx.name}
				disabled={ctx.disabled}
				aria-invalid={ctx.state.valid === false ? true : undefined}
				aria-describedby={describedBy || undefined}
				class={className}
				connect={(el: HTMLInputElement) => {
					inputRef = el;
				}}
				on={{
					input: (e) => handleChange(e.currentTarget.value),
					blur: () => handleBlur(),
					focus: () => handleFocus(),
				}}
				{...dataAttrs}
				{...inputProps}
			/>
		);
	};
}

export function FieldDescription(handle: Handle) {
	const ctx = handle.context.get(FieldRoot);
	const id = generateId("field-description");

	if (ctx) {
		ctx.addDescriptionId(id);
		handle.signal.addEventListener("abort", () => {
			ctx.removeDescriptionId(id);
		});
	}

	return (props: { children: RemixNode; class?: string }) => {
		if (!ctx) return <p class={props.class}>{props.children}</p>;

		const dataAttrs = getStateDataAttributes(ctx.state);

		return (
			<p id={id} class={props.class} {...dataAttrs}>
				{props.children}
			</p>
		);
	};
}

export function FieldError(handle: Handle) {
	const ctx = handle.context.get(FieldRoot);
	const id = generateId("field-error");

	if (ctx) {
		ctx.addErrorId(id);
		handle.signal.addEventListener("abort", () => {
			ctx.removeErrorId(id);
		});
	}

	return (props: {
		children?: RemixNode;
		class?: string;
		match?: boolean | keyof FieldValidityState;
		forceShow?: boolean;
	}) => {
		if (!ctx) return null;

		const { match, forceShow, children, class: className } = props;
		const { validityData, state } = ctx;

		let shouldRender = false;

		if (forceShow || match === true) {
			shouldRender = true;
		} else if (match === false) {
			shouldRender = false;
		} else if (typeof match === "string") {
			shouldRender = validityData.state[match] ?? false;
		} else {
			shouldRender = validityData.state.valid === false;
		}

		if (!shouldRender) return null;

		const dataAttrs = getStateDataAttributes(state);
		const errorContent =
			children ??
			(validityData.errors.length > 1 ? (
				<ul>
					{validityData.errors.map((error) => (
						<li>{error}</li>
					))}
				</ul>
			) : (
				validityData.error
			));

		return (
			<div id={id} role="alert" class={className} {...dataAttrs}>
				{errorContent}
			</div>
		);
	};
}

export function FieldValidity(handle: Handle) {
	const ctx = handle.context.get(FieldRoot);

	return (props: {
		children: (
			state: FieldValidityData & { validity: FieldValidityState },
		) => RemixNode;
	}) => {
		if (!ctx) return null;

		const validityState = {
			...ctx.validityData,
			validity: ctx.validityData.state,
		};

		return <>{props.children(validityState)}</>;
	};
}

export const Field = {
	Root: FieldRoot,
	Label: FieldLabel,
	Control: FieldControl,
	Description: FieldDescription,
	Error: FieldError,
	Validity: FieldValidity,
};
