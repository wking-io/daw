import { cn } from "@app/utils/cn";
import type * as React from "react";

export interface ProjectionContentProps {
	/** Children to render as DOM content */
	children: React.ReactNode;
	/** Whether the content should receive pointer events */
	interactive?: boolean;
	/** Optional className for styling */
	className?: string;
}

/**
 * DOM content layer for the projection.
 * Renders a `<div>` element positioned absolutely within the projection.
 */
export function ProjectionContent({
	children,
	interactive = true,
	className,
}: ProjectionContentProps) {
	return (
		<div
			className={cn(
				"absolute inset-0",
				!interactive && "pointer-events-none",
				className,
			)}
		>
			{children}
		</div>
	);
}

export namespace ProjectionContent {
	export type Props = ProjectionContentProps;
}
