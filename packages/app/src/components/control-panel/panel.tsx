import type { Handle, RemixNode } from "@remix-run/component";
import { TypedEventTarget } from "@remix-run/interaction";
import {
	type AsciiLoaderType,
	asciiOptions,
	isAsciiLoaderType,
} from "../ascii-loader";
import { Popover } from "../Popover";
import { Select } from "./select";

class ControlPanelContext extends TypedEventTarget<{ change: Event }> {
	#loaderType: AsciiLoaderType = "dots";
	get loaderType() {
		return this.#loaderType;
	}

	setLoaderType(value: AsciiLoaderType) {
		this.#loaderType = value;
		this.dispatchEvent(new Event("change"));
	}
}

export function ControlPanelRoot(handle: Handle<ControlPanelContext>) {
	const ctx = new ControlPanelContext();
	handle.context.set(ctx);

	return (props: { children: RemixNode }) => props.children;
}

export function ControlPanelContent(handle: Handle) {
	const ctx = handle.context.get(ControlPanelRoot);

	handle.on(ctx, { change: () => handle.update() });

	return () => (
		<Popover.Root setup={{ onOpenChange: (open) => console.log(open) }}>
			<Popover.Trigger class="fixed top-1 right-1 size-4 flex items-center justify-center">
				<span>⚙</span>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Backdrop />
				<Popover.Content side="bottom" align="end">
					<Select
						setup={{
							onChange: (value: string) => {
								if (isAsciiLoaderType(value)) {
									ctx.setLoaderType(value);
								}
							},
							options: asciiOptions,
						}}
						value={ctx.loaderType}
					/>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

export const ControlPanel = {
	Root: ControlPanelRoot,
	Content: ControlPanelContent,
};
