import { cn } from "@app/utils/cn";

export interface NavigatorContentProps {
	/** Children to render as DOM content */
	children: React.ReactNode;
	/** Optional className for styling */
	className?: string;
}

/**
 * DOM content layer for the navigator.
 * Renders a `<div>` element positioned absolutely within the navigator.
 */
export function NavigatorContent({
	children,
	className,
}: NavigatorContentProps) {
	return (
		<div className={cn("pointer-events-none absolute inset-0", className)}>
			{children}
		</div>
	);
}

export namespace NavigatorContent {
	export type Props = NavigatorContentProps;
}
