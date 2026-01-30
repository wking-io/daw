import type { Handle, Props, RemixNode } from "@remix-run/component";

export type TabValue = string | number | (string & {});
export type Orientation = "horizontal" | "vertical";
export type ActivationDirection = "left" | "right" | "up" | "down" | "none";

export interface TabsState {
	orientation: Orientation;
	activationDirection: ActivationDirection;
}

export interface TabState {
	active: boolean;
	disabled: boolean;
	orientation: Orientation;
}

export interface TabPanelState {
	hidden: boolean;
	orientation: Orientation;
}

interface TabMetadata {
	id: string;
	value: TabValue;
	disabled: boolean;
	element: HTMLElement | null;
}

interface PanelMetadata {
	id: string;
	value: TabValue;
}

export interface TabsContextValue {
	value: TabValue | null;
	orientation: Orientation;
	activationDirection: ActivationDirection;
	onValueChange: (value: TabValue) => void;
	registerTab: (metadata: TabMetadata) => void;
	unregisterTab: (value: TabValue) => void;
	registerPanel: (metadata: PanelMetadata) => void;
	unregisterPanel: (value: TabValue) => void;
	getTabId: (value: TabValue) => string | undefined;
	getPanelId: (value: TabValue) => string | undefined;
	getTabElement: (value: TabValue) => HTMLElement | null;
	getTabs: () => TabMetadata[];
	update: () => void;
}

export interface TabsListContextValue {
	activateOnFocus: boolean;
	highlightedIndex: number;
	setHighlightedIndex: (index: number) => void;
	listElement: HTMLElement | null;
	setListElement: (element: HTMLElement | null) => void;
}

function generateId(prefix: string): string {
	return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStateDataAttributes(state: TabsState): Record<string, string> {
	return {
		"data-orientation": state.orientation,
		"data-activation-direction": state.activationDirection,
	};
}

function getTabDataAttributes(state: TabState): Record<string, string> {
	const attrs: Record<string, string> = {
		"data-orientation": state.orientation,
	};
	if (state.active) attrs["data-active"] = "";
	if (state.disabled) attrs["data-disabled"] = "";
	return attrs;
}

function getPanelDataAttributes(state: TabPanelState): Record<string, string> {
	const attrs: Record<string, string> = {
		"data-orientation": state.orientation,
	};
	if (state.hidden) attrs["data-hidden"] = "";
	return attrs;
}

export function TabsRoot(
	handle: Handle<TabsContextValue>,
	setup?: {
		defaultValue?: TabValue;
		orientation?: Orientation;
	},
) {
	const orientation = setup?.orientation ?? "horizontal";
	let internalValue: TabValue | null = setup?.defaultValue ?? null;
	let activationDirection: ActivationDirection = "none";
	const tabs: Map<TabValue, TabMetadata> = new Map();
	const panels: Map<TabValue, PanelMetadata> = new Map();

	let currentOnValueChange: ((value: TabValue) => void) | undefined;
	let isControlled = false;
	let controlledValue: TabValue | null = null;

	const getCurrentValue = (): TabValue | null => {
		return isControlled ? controlledValue : internalValue;
	};

	const getTabPosition = (value: TabValue): number | null => {
		const tab = tabs.get(value);
		if (!tab?.element) return null;
		const listElement = tab.element.parentElement;
		if (!listElement) return null;

		const tabRect = tab.element.getBoundingClientRect();
		const listRect = listElement.getBoundingClientRect();

		return orientation === "horizontal"
			? tabRect.left - listRect.left
			: tabRect.top - listRect.top;
	};

	const calculateDirection = (
		oldValue: TabValue | null,
		newValue: TabValue,
	): ActivationDirection => {
		if (oldValue === null) return "none";

		const oldPos = getTabPosition(oldValue);
		const newPos = getTabPosition(newValue);

		if (oldPos === null || newPos === null) return "none";

		if (orientation === "horizontal") {
			if (newPos < oldPos) return "left";
			if (newPos > oldPos) return "right";
		} else {
			if (newPos < oldPos) return "up";
			if (newPos > oldPos) return "down";
		}

		return "none";
	};

	const onValueChange = (value: TabValue) => {
		const tab = tabs.get(value);
		if (tab?.disabled) return;

		const currentValue = getCurrentValue();
		activationDirection = calculateDirection(currentValue, value);

		if (!isControlled) {
			internalValue = value;
		}

		currentOnValueChange?.(value);
		handle.update();
	};

	const registerTab = (metadata: TabMetadata) => {
		tabs.set(metadata.value, metadata);
	};

	const unregisterTab = (value: TabValue) => {
		tabs.delete(value);
	};

	const registerPanel = (metadata: PanelMetadata) => {
		panels.set(metadata.value, metadata);
	};

	const unregisterPanel = (value: TabValue) => {
		panels.delete(value);
	};

	const getTabId = (value: TabValue): string | undefined => {
		return tabs.get(value)?.id;
	};

	const getPanelId = (value: TabValue): string | undefined => {
		return panels.get(value)?.id;
	};

	const getTabElement = (value: TabValue): HTMLElement | null => {
		return tabs.get(value)?.element ?? null;
	};

	const getTabs = (): TabMetadata[] => {
		return Array.from(tabs.values());
	};

	handle.context.set({
		get value() {
			return getCurrentValue();
		},
		orientation,
		get activationDirection() {
			return activationDirection;
		},
		onValueChange,
		registerTab,
		unregisterTab,
		registerPanel,
		unregisterPanel,
		getTabId,
		getPanelId,
		getTabElement,
		getTabs,
		update: () => handle.update(),
	});

	return (props: {
		children: RemixNode;
		class?: string;
		value?: TabValue;
		onValueChange?: (value: TabValue) => void;
	}) => {
		isControlled = props.value !== undefined;
		controlledValue = props.value ?? null;
		currentOnValueChange = props.onValueChange;

		const state: TabsState = {
			orientation,
			activationDirection,
		};
		const dataAttrs = getStateDataAttributes(state);

		return (
			<div class={props.class} {...dataAttrs}>
				{props.children}
			</div>
		);
	};
}

export function TabsList(
	handle: Handle<TabsListContextValue>,
	setup?: {
		activateOnFocus?: boolean;
		loop?: boolean;
	},
) {
	const ctx = handle.context.get(TabsRoot);
	let highlightedIndex = -1;
	let listElement: HTMLElement | null = null;

	const activateOnFocus = setup?.activateOnFocus ?? true;
	const loop = setup?.loop ?? true;

	const setHighlightedIndex = (index: number) => {
		highlightedIndex = index;
	};

	const setListElement = (element: HTMLElement | null) => {
		listElement = element;
	};

	handle.context.set({
		activateOnFocus,
		get highlightedIndex() {
			return highlightedIndex;
		},
		setHighlightedIndex,
		get listElement() {
			return listElement;
		},
		setListElement,
	});

	const handleKeyDown = (event: KeyboardEvent) => {
		if (!ctx) return;

		const tabs = ctx.getTabs().filter((t) => !t.disabled);
		if (tabs.length === 0) return;

		const currentIndex = tabs.findIndex((t) => t.value === ctx.value);
		let nextIndex = currentIndex;

		const isHorizontal = ctx.orientation === "horizontal";
		const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";
		const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";

		switch (event.key) {
			case prevKey:
				event.preventDefault();
				nextIndex = currentIndex - 1;
				if (nextIndex < 0) {
					nextIndex = loop ? tabs.length - 1 : 0;
				}
				break;
			case nextKey:
				event.preventDefault();
				nextIndex = currentIndex + 1;
				if (nextIndex >= tabs.length) {
					nextIndex = loop ? 0 : tabs.length - 1;
				}
				break;
			case "Home":
				event.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				event.preventDefault();
				nextIndex = tabs.length - 1;
				break;
			default:
				return;
		}

		const nextTab = tabs[nextIndex];
		if (nextTab) {
			nextTab.element?.focus();
			if (activateOnFocus) {
				ctx.onValueChange(nextTab.value);
			}
			setHighlightedIndex(nextIndex);
		}
	};

	return (props: Props<"div"> & { class?: string }) => {
		const { class: className, ...rest } = props;

		if (!ctx) {
			return (
				<div role="tablist" class={className} {...rest}>
					{props.children}
				</div>
			);
		}

		const state: TabsState = {
			orientation: ctx.orientation,
			activationDirection: ctx.activationDirection,
		};
		const dataAttrs = getStateDataAttributes(state);

		return (
			<div
				role="tablist"
				aria-orientation={ctx.orientation}
				class={className}
				connect={(el: HTMLElement) => {
					setListElement(el);
				}}
				on={{
					keydown: handleKeyDown,
				}}
				{...dataAttrs}
				{...rest}
			>
				{props.children}
			</div>
		);
	};
}

export function TabsTab(
	handle: Handle,
	setup: {
		value: TabValue;
		disabled?: boolean;
	},
) {
	const ctx = handle.context.get(TabsRoot);
	const listCtx = handle.context.get(TabsList);
	const id = generateId("tab");
	let tabElement: HTMLElement | null = null;

	if (ctx) {
		ctx.registerTab({
			id,
			value: setup.value,
			disabled: setup.disabled ?? false,
			get element() {
				return tabElement;
			},
		});

		handle.signal.addEventListener("abort", () => {
			ctx.unregisterTab(setup.value);
		});
	}

	return (props: Props<"button"> & { class?: string }) => {
		const { class: className, children, ...rest } = props;

		if (!ctx) {
			return (
				<button type="button" role="tab" class={className} {...rest}>
					{children}
				</button>
			);
		}

		const isActive = ctx.value === setup.value;
		const isDisabled = setup.disabled ?? false;
		const panelId = ctx.getPanelId(setup.value);

		const state: TabState = {
			active: isActive,
			disabled: isDisabled,
			orientation: ctx.orientation,
		};
		const dataAttrs = getTabDataAttributes(state);

		return (
			<button
				id={id}
				type="button"
				role="tab"
				aria-selected={isActive}
				aria-controls={panelId}
				aria-disabled={isDisabled || undefined}
				disabled={isDisabled}
				tabIndex={isActive ? 0 : -1}
				class={className}
				connect={(el: HTMLButtonElement) => {
					tabElement = el;
				}}
				on={{
					click: () => {
						if (!isDisabled) {
							ctx.onValueChange(setup.value);
						}
					},
					keydown: (event: KeyboardEvent) => {
						if (event.key === "Enter" && !isDisabled) {
							event.preventDefault();
							ctx.onValueChange(setup.value);
						}
					},
					focus: () => {
						if (listCtx?.activateOnFocus && !isDisabled) {
							ctx.onValueChange(setup.value);
						}
					},
				}}
				{...dataAttrs}
				{...rest}
			>
				{children}
			</button>
		);
	};
}

export function TabsPanel(
	handle: Handle,
	setup: {
		value: TabValue;
		keepMounted?: boolean;
	},
) {
	const ctx = handle.context.get(TabsRoot);
	const id = generateId("tabpanel");

	if (ctx) {
		ctx.registerPanel({
			id,
			value: setup.value,
		});

		handle.signal.addEventListener("abort", () => {
			ctx.unregisterPanel(setup.value);
		});
	}

	return (props: Props<"div"> & { class?: string }) => {
		const { class: className, children, ...rest } = props;

		if (!ctx) {
			return (
				<div role="tabpanel" class={className} {...rest}>
					{children}
				</div>
			);
		}

		const isActive = ctx.value === setup.value;
		const hidden = !isActive;
		const tabId = ctx.getTabId(setup.value);

		if (hidden && !setup.keepMounted) {
			return null;
		}

		const state: TabPanelState = {
			hidden,
			orientation: ctx.orientation,
		};
		const dataAttrs = getPanelDataAttributes(state);

		return (
			<div
				id={id}
				role="tabpanel"
				aria-labelledby={tabId}
				hidden={hidden || undefined}
				class={className}
				{...dataAttrs}
				{...rest}
			>
				{children}
			</div>
		);
	};
}

export interface TabsIndicatorPosition {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export interface TabsIndicatorSize {
	width: number;
	height: number;
}

export function TabsIndicator(handle: Handle) {
	const ctx = handle.context.get(TabsRoot);
	const listCtx = handle.context.get(TabsList);

	let position: TabsIndicatorPosition | null = null;
	let size: TabsIndicatorSize | null = null;

	const calculatePosition = () => {
		if (!ctx || ctx.value === null) {
			position = null;
			size = null;
			return;
		}

		const activeTab = ctx.getTabElement(ctx.value);
		const listElement = listCtx?.listElement;

		if (!activeTab || !listElement) {
			position = null;
			size = null;
			return;
		}

		const tabRect = activeTab.getBoundingClientRect();
		const listRect = listElement.getBoundingClientRect();

		const left = tabRect.left - listRect.left + listElement.scrollLeft;
		const top = tabRect.top - listRect.top + listElement.scrollTop;
		const right = listRect.right - tabRect.right;
		const bottom = listRect.bottom - tabRect.bottom;

		position = { left, right, top, bottom };
		size = { width: tabRect.width, height: tabRect.height };
	};

	// Recalculate after tabs connect to DOM
	handle.queueTask(() => {
		calculatePosition();
		handle.update();
	});

	return (props: Props<"span"> & { class?: string }) => {
		const { class: className, ...rest } = props;

		if (!ctx) {
			return <span class={className} {...rest} />;
		}

		calculatePosition();

		if (!position || !size) {
			return null;
		}

		const style = {
			"--active-tab-left": `${position.left}px`,
			"--active-tab-right": `${position.right}px`,
			"--active-tab-top": `${position.top}px`,
			"--active-tab-bottom": `${position.bottom}px`,
			"--active-tab-width": `${size.width}px`,
			"--active-tab-height": `${size.height}px`,
		};

		const state: TabsState = {
			orientation: ctx.orientation,
			activationDirection: ctx.activationDirection,
		};
		const dataAttrs = getStateDataAttributes(state);

		return (
			<span
				role="presentation"
				aria-hidden="true"
				class={className}
				style={style}
				{...dataAttrs}
				{...rest}
			/>
		);
	};
}

export const Tabs = {
	Root: TabsRoot,
	List: TabsList,
	Tab: TabsTab,
	Panel: TabsPanel,
	Indicator: TabsIndicator,
};
