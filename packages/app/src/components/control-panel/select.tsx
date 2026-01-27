import type { Handle } from "@remix-run/component";

function generateId(): string {
	return `select-${Math.random().toString(36).slice(2, 9)}`;
}

export function Select(
	_handle: Handle,
	setup: {
		onChange: (value: string) => void;
		options: string[];
	},
) {
	const id = generateId();

	const prevOption = (options: string[], value: string): string => {
		const index = options.indexOf(value);
		return options[index - 1] ?? options[options.length - 1] ?? value;
	};

	const nextOption = (options: string[], value: string): string => {
		const index = options.indexOf(value);
		return options[index + 1] ?? options[0] ?? value;
	};

	return (props: { value: string }) => {
		return (
			<div id={id} class="flex">
				<button
					type="button"
					on={{
						click: () => setup.onChange(prevOption(setup.options, props.value)),
					}}
					class="border-foreground bg-layer text-foreground hover:bg-layer-2 active:bg-layer-2 flex size-6 items-center justify-center border bg-clip-padding select-none"
				>
					<ChevronIcon class="h-auto w-3 rotate-180" />
				</button>
				<input
					class="border-foreground bg-layer font-code text-foreground focus:outline-brand-green h-6 flex-1 border-x-0 border-t border-b text-center text-xs font-extralight tabular-nums focus:z-1 focus:outline focus:-outline-offset-1"
					value={props.value}
					on={{
						input: (e) => setup.onChange(e.currentTarget.value),
					}}
				/>
				<button
					type="button"
					on={{
						click: () => setup.onChange(nextOption(setup.options, props.value)),
					}}
					class="border-foreground bg-layer text-foreground hover:bg-layer-2 active:bg-layer-2 flex size-6 items-center justify-center border bg-clip-padding select-none"
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
