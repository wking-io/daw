import type { Handle, Props, RemixNode } from "@remix-run/component";
import { cn } from "../../utils/cn";

export function Button(_handle: Handle) {
	return (
		props: Props<"button"> & {
			children: RemixNode;
		},
	) => {
		const { children, class: className, ...buttonProps } = props;

		return (
			<div class="relative before:pointer-events-none before:absolute before:-inset-1 before:rounded-[11px] before:border before:border-sky-5 before:ring-2 before:ring-sky-5/20 before:opacity-0 before:transition focus-within:before:opacity-100 after:pointer-events-none after:absolute after:inset-px after:rounded-[7px] after:shadow-highlight after:shadow-foreground/5 after:transition focus-within:after:shadow-sky-5/20">
				<button
					type="button"
					class={cn(
						"relative text-sm cursor-pointer bg-layer hover:bg-layer-2 text-foreground px-3.5 py-2 rounded-lg border border-foreground/5 shadow-input shadow-foreground/5 dark:shadow-foreground/10 outline-none",
						className,
					)}
					{...buttonProps}
				>
					{children}
				</button>
			</div>
		);
	};
}
