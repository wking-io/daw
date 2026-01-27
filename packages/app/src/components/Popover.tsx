import type { Handle, RemixNode } from "@remix-run/component";

export type PopoverSide = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

interface PopoverPosition {
	top: number;
	left: number;
	transformOrigin: string;
}

interface PopoverContextValue {
	open: boolean;
	triggerRef: HTMLElement | null;
	setTriggerRef: (el: HTMLElement | null) => void;
	openPopover: () => void;
	closePopover: () => void;
	toggle: () => void;
	popoverId: string;
}

function generateId(): string {
	return `popover-${Math.random().toString(36).slice(2, 9)}`;
}

function calculatePosition(
	trigger: HTMLElement,
	popover: HTMLElement,
	side: PopoverSide,
	align: PopoverAlign,
	sideOffset: number,
	alignOffset: number,
): PopoverPosition {
	const triggerRect = trigger.getBoundingClientRect();
	const popoverRect = popover.getBoundingClientRect();
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	let top = 0;
	let left = 0;
	let transformOrigin = "center center";

	const alignments = {
		start: 0,
		center: 0.5,
		end: 1,
	};

	const alignFactor = alignments[align];

	switch (side) {
		case "top":
			top = triggerRect.top - popoverRect.height - sideOffset;
			left =
				triggerRect.left +
				triggerRect.width * alignFactor -
				popoverRect.width * alignFactor +
				alignOffset;
			transformOrigin = `${align === "start" ? "left" : align === "end" ? "right" : "center"} bottom`;
			break;
		case "bottom":
			top = triggerRect.bottom + sideOffset;
			left =
				triggerRect.left +
				triggerRect.width * alignFactor -
				popoverRect.width * alignFactor +
				alignOffset;
			transformOrigin = `${align === "start" ? "left" : align === "end" ? "right" : "center"} top`;
			break;
		case "left":
			top =
				triggerRect.top +
				triggerRect.height * alignFactor -
				popoverRect.height * alignFactor +
				alignOffset;
			left = triggerRect.left - popoverRect.width - sideOffset;
			transformOrigin = `right ${align === "start" ? "top" : align === "end" ? "bottom" : "center"}`;
			break;
		case "right":
			top =
				triggerRect.top +
				triggerRect.height * alignFactor -
				popoverRect.height * alignFactor +
				alignOffset;
			left = triggerRect.right + sideOffset;
			transformOrigin = `left ${align === "start" ? "top" : align === "end" ? "bottom" : "center"}`;
			break;
	}

	const padding = 8;
	if (left < padding) left = padding;
	if (left + popoverRect.width > viewportWidth - padding) {
		left = viewportWidth - popoverRect.width - padding;
	}
	if (top < padding) top = padding;
	if (top + popoverRect.height > viewportHeight - padding) {
		top = viewportHeight - popoverRect.height - padding;
	}

	return { top, left, transformOrigin };
}

export function PopoverRoot(
	handle: Handle<PopoverContextValue>,
	setup: {
		defaultOpen?: boolean;
		onOpenChange?: (open: boolean) => void;
	},
) {
	let open = setup.defaultOpen ?? false;
	let triggerRef: HTMLElement | null = null;
	const popoverId = generateId();

	const setTriggerRef = (el: HTMLElement | null) => {
		triggerRef = el;
	};

	const openPopover = () => {
		if (!open) {
			open = true;
			setup.onOpenChange?.(true);
			handle.update();
		}
	};

	const closePopover = () => {
		if (open) {
			open = false;
			setup.onOpenChange?.(false);
			handle.update();
		}
	};

	const toggle = () => {
		if (open) {
			closePopover();
		} else {
			openPopover();
		}
	};

	handle.context.set({
		get open() {
			return open;
		},
		get triggerRef() {
			return triggerRef;
		},
		setTriggerRef,
		openPopover,
		closePopover,
		toggle,
		popoverId,
	});

	return (props: {
		defaultOpen?: boolean;
		onOpenChange?: (open: boolean) => void;
		children: RemixNode;
	}) => <>{props.children}</>;
}

export function PopoverTrigger(handle: Handle) {
	const ctx = handle.context.get(PopoverRoot);

	return (props: { children: RemixNode; class?: string }) => (
		<button
			type="button"
			aria-haspopup="dialog"
			aria-expanded={ctx?.open ?? false}
			aria-controls={ctx?.popoverId}
			connect={(el: HTMLButtonElement) => {
				ctx?.setTriggerRef(el);
			}}
			on={{
				click: () => ctx?.toggle(),
			}}
			class={props.class}
		>
			{props.children}
		</button>
	);
}

export function PopoverPortal(handle: Handle) {
	return (props: { children: RemixNode }) => {
		const ctx = handle.context.get(PopoverRoot);
		if (!ctx?.open) return null;
		return <>{props.children}</>;
	};
}

export function PopoverBackdrop(handle: Handle) {
	const ctx = handle.context.get(PopoverRoot);

	return () => (
		<div
			css={{
				position: "fixed",
				inset: 0,
				zIndex: 999,
			}}
			on={{
				click: () => ctx?.closePopover(),
			}}
		/>
	);
}

export function PopoverContent(handle: Handle) {
	const ctx = handle.context.get(PopoverRoot);
	let position: PopoverPosition | null = null;

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			ctx?.closePopover();
		}
	};

	handle.on(document, { keydown: handleKeyDown });

	return (props: {
		side?: PopoverSide;
		align?: PopoverAlign;
		sideOffset?: number;
		alignOffset?: number;
		children: RemixNode;
	}) => {
		const side = props.side ?? "bottom";
		const align = props.align ?? "center";
		const sideOffset = props.sideOffset ?? 8;
		const alignOffset = props.alignOffset ?? 0;

		return (
			<div
				id={ctx?.popoverId}
				role="dialog"
				aria-modal="false"
				data-side={side}
				data-align={align}
				data-state={ctx?.open ? "open" : "closed"}
				css={{
					position: "fixed",
					zIndex: 1000,
					outline: "none",
				}}
				style={
					position
						? {
								top: `${position.top}px`,
								left: `${position.left}px`,
								transformOrigin: position.transformOrigin,
							}
						: { visibility: "hidden" }
				}
				connect={(el: HTMLDivElement, signal) => {
					const updatePosition = () => {
						if (ctx?.triggerRef && el) {
							position = calculatePosition(
								ctx.triggerRef,
								el,
								side,
								align,
								sideOffset,
								alignOffset,
							);
							handle.update();
						}
					};

					requestAnimationFrame(updatePosition);

					window.addEventListener("resize", updatePosition, { signal });
					window.addEventListener("scroll", updatePosition, {
						signal,
						capture: true,
					});

					el.focus();
				}}
				tabindex={-1}
			>
				{props.children}
			</div>
		);
	};
}

export function PopoverClose(handle: Handle) {
	const ctx = handle.context.get(PopoverRoot);

	return (props: { children: RemixNode }) => (
		<button
			type="button"
			css={{
				background: "none",
				border: "none",
				padding: 0,
				cursor: "pointer",
			}}
			on={{
				click: () => ctx?.closePopover(),
			}}
		>
			{props.children}
		</button>
	);
}

export function PopoverArrow(_handle: Handle) {
	return (props: { width?: number; height?: number }) => {
		const width = props.width ?? 10;
		const height = props.height ?? 5;

		return (
			<svg
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				css={{
					display: "block",
					fill: "currentColor",
				}}
				data-popover-arrow=""
				aria-hidden="true"
			>
				<polygon points={`0,${height} ${width / 2},0 ${width},${height}`} />
			</svg>
		);
	};
}

export const Popover = {
	Root: PopoverRoot,
	Trigger: PopoverTrigger,
	Portal: PopoverPortal,
	Backdrop: PopoverBackdrop,
	Content: PopoverContent,
	Close: PopoverClose,
	Arrow: PopoverArrow,
};
