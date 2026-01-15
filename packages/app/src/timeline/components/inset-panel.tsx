import { cn } from "@app/utils/cn";
import type { PropsWithChildren } from "react";

export function InsetPanel({
	children,
	className,
}: PropsWithChildren<{ className?: string }>) {
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-sm bg-linear-to-b from-neutral-900 via-neutral-800 to-neutral-600 p-px",
				className,
			)}
		>
			<div className="absolute inset-0 rounded-sm bg-linear-[175deg] from-neutral-950 to-neutral-950/0 to-20%" />
			<div className="absolute inset-0 rounded-sm bg-linear-[175deg] from-white/0 from-80% to-white/40" />
			{children}
		</div>
	);
}
