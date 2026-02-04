import type { Handle, RemixNode } from "@remix-run/component";

/**
 * Value type for tab identification.
 */
export type TabValue = string | number | (string & {});

/**
 * Orientation of the tabs.
 */
export type TabsOrientation = "horizontal" | "vertical";

/**
 * Direction of tab activation.
 */
export type TabsActivationDirection = "left" | "right" | "up" | "down" | "none";

/**
 * State of the tabs component.
 */
export interface TabsRootState {
  orientation: TabsOrientation;
  activationDirection: TabsActivationDirection;
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

/**
 * Setup configuration for the Tabs component.
 */
export interface TabsRootSetup {
  /**
   * The default selected tab value.
   */
  defaultValue?: TabValue;
  /**
   * The orientation of the tabs.
   * @default "horizontal"
   */
  orientation?: TabsOrientation;
  /**
   * Whether tabs can be closed.
   * When true, enables Delete key to close focused tab and CloseTrigger components.
   * @default false
   */
  closable?: boolean;
}

/**
 * Props passed to the TabsRoot render function.
 */
export interface TabsRootProps {
  children: RemixNode;
  class?: string;
  /**
   * Controlled value. When provided, the component is controlled.
   */
  value?: TabValue;
  /**
   * Callback when the value changes.
   */
  onValueChange?: (value: TabValue) => void;
  /**
   * Callback when a tab should be closed.
   * Only called when closable is true.
   */
  onTabClose?: (value: TabValue) => void;
}

/**
 * Context value provided by TabsRoot.
 */
export interface TabsRootContextValue {
  value: TabValue | null;
  orientation: TabsOrientation;
  activationDirection: TabsActivationDirection;
  closable: boolean;
  onValueChange: (value: TabValue) => void;
  onTabClose: (value: TabValue) => void;
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

function getStateDataAttributes(state: TabsRootState): Record<string, string> {
  return {
    "data-orientation": state.orientation,
    "data-activation-direction": state.activationDirection,
  };
}

/**
 * Root component for tabs.
 * Provides context for tab list, tabs, and panels.
 * Renders a `<div>` element.
 *
 * @example
 * ```tsx
 * <Tabs.Root setup={{ defaultValue: "tab1" }}>
 *   <Tabs.List setup={{}}>
 *     <Tabs.Tab setup={{ value: "tab1" }}>Tab 1</Tabs.Tab>
 *     <Tabs.Tab setup={{ value: "tab2" }}>Tab 2</Tabs.Tab>
 *   </Tabs.List>
 *   <Tabs.Panel setup={{ value: "tab1" }}>Content 1</Tabs.Panel>
 *   <Tabs.Panel setup={{ value: "tab2" }}>Content 2</Tabs.Panel>
 * </Tabs.Root>
 * ```
 */
export function TabsRoot(handle: Handle<TabsRootContextValue>, setup: TabsRootSetup = {}) {
  const orientation = setup.orientation ?? "horizontal";
  const closable = setup.closable ?? false;
  let internalValue: TabValue | null = setup.defaultValue ?? null;
  let activationDirection: TabsActivationDirection = "none";
  const tabs: Map<TabValue, TabMetadata> = new Map();
  const panels: Map<TabValue, PanelMetadata> = new Map();

  let currentOnValueChange: ((value: TabValue) => void) | undefined;
  let currentOnTabClose: ((value: TabValue) => void) | undefined;
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

    return orientation === "horizontal" ? tabRect.left - listRect.left : tabRect.top - listRect.top;
  };

  const calculateDirection = (
    oldValue: TabValue | null,
    newValue: TabValue,
  ): TabsActivationDirection => {
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

  const onTabClose = (value: TabValue) => {
    if (!closable) return;
    currentOnTabClose?.(value);
  };

  handle.context.set({
    get value() {
      return getCurrentValue();
    },
    orientation,
    get activationDirection() {
      return activationDirection;
    },
    closable,
    onValueChange,
    onTabClose,
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

  return (props: TabsRootProps) => {
    isControlled = props.value !== undefined;
    controlledValue = props.value ?? null;
    currentOnValueChange = props.onValueChange;
    currentOnTabClose = props.onTabClose;

    const state: TabsRootState = {
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

// Export the getStateDataAttributes for use by child components
export { getStateDataAttributes as getTabsStateDataAttributes };

/**
 * Namespace containing all TabsRoot-related types.
 */
export namespace TabsRoot {
  export type Value = TabValue;
  export type Orientation = TabsOrientation;
  export type ActivationDirection = TabsActivationDirection;
  export type State = TabsRootState;
  export type Setup = TabsRootSetup;
  export type Props = TabsRootProps;
  export type ContextValue = TabsRootContextValue;
}
