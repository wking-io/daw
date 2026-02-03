import type { Handle, Props } from "@remix-run/component";
import { TabsRoot, type TabsValue, type TabsOrientation } from "../root/TabsRoot";
import { generateId } from "../../utils/generate-id";

/**
 * Setup configuration for the TabsPanel component.
 */
export interface TabsPanelSetup {
  /**
   * The value that identifies which tab this panel belongs to.
   */
  value: TabsValue;
  /**
   * Whether to keep the panel mounted when inactive.
   * @default false
   */
  keepMounted?: boolean;
}

/**
 * Props passed to the TabsPanel render function.
 */
export interface TabsPanelProps extends Props<"div"> {
  class?: string;
}

/**
 * State of a tab panel.
 */
export interface TabsPanelState {
  hidden: boolean;
  orientation: TabsOrientation;
}

function getPanelDataAttributes(state: TabsPanelState): Record<string, string> {
  const attrs: Record<string, string> = {
    "data-orientation": state.orientation,
  };
  if (state.hidden) attrs["data-hidden"] = "";
  return attrs;
}

/**
 * Panel component that displays content for a tab.
 * Renders a `<div>` element with role="tabpanel".
 *
 * @example
 * ```tsx
 * <Tabs.Panel setup={{ value: "tab1" }}>
 *   Content for tab 1
 * </Tabs.Panel>
 * <Tabs.Panel setup={{ value: "tab2", keepMounted: true }}>
 *   Content for tab 2 (stays mounted)
 * </Tabs.Panel>
 * ```
 */
export function TabsPanel(handle: Handle, setup: TabsPanelSetup) {
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

  return (props: TabsPanelProps) => {
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

    const state: TabsPanelState = {
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

/**
 * Namespace containing all TabsPanel-related types.
 */
export namespace TabsPanel {
  export type Value = TabsValue;
  export type Setup = TabsPanelSetup;
  export type Props = TabsPanelProps;
  export type State = TabsPanelState;
}
