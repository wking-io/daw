import type { Handle, RemixNode } from "@remix-run/component";
import { TypedEventTarget } from "@remix-run/interaction";
import { cn } from "../../utils/cn";
import {
	type AsciiLoaderType,
	asciiOptions,
	isAsciiLoaderType,
} from "../ascii-loader";
import { Field } from "../ui/field";
import { Popover } from "../ui/popover";
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

	return (props: { class?: string }) => (
		<Popover.Root setup={{ onOpenChange: (open) => console.log(open) }}>
			<Popover.Trigger
				class={cn(
					"flex items-center justify-center font-mono whitespace-pre text-xl text-foreground-muted hover:text-foreground hover:bg-layer rounded-xl size-6",
					props.class,
				)}
			>
				<span class="-mt-0.5 -mr-px">⚙</span>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Backdrop class="fixed inset-0 z-40" />
				<Popover.Positioner side="bottom" align="end" class="z-50">
					<Popover.Content class="outline-none bg-linear-to-b from-foreground/50 to-foreground/20 rounded-xl p-px">
						<div class="bg-linear-to-b from-layer to-background rounded-[11px] p-px">
							<div class="rounded-[10px] bg-layer p-3">
								<Field.Root
									setup={{ name: "loaderType" }}
									class="flex flex-col gap-1"
								>
									<Field.Label class="text-xs">Loader Type</Field.Label>
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
								</Field.Root>
							</div>
						</div>
					</Popover.Content>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

export const ControlPanel = {
	Root: ControlPanelRoot,
	Content: ControlPanelContent,
};
