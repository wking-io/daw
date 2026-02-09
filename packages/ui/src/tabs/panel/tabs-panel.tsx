import type { Handle, Props } from "@remix-run/component";
import { TabsRoot, type TabValue, type TabsOrientation } from "../root/tabs-root";
import { generateId } from "../../utils/generate-id";
import { getDataAttributes } from "../../utils/data-attributes";

/**
 * Setup configuration for the TabsPanel component.
 */
export interface TabsPanelSetup {
  /**
   * The value that identifies which tab this panel belongs to.
   */
  value: TabValue;
  /**
   * Whether to keep the panel mounted when inactive.
   * @default false
   */
  keepMounted?: boolean;
}

/**
 * Props passed to the TabsPanel render function.
 */
export interface TabsPanelProps extends Props<"div"> {}

/**
 * State of a tab panel.
 */
export interface TabsPanelState {
  hidden: boolean;
  orientation: TabsOrientation;
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
    if (!ctx) {
      return <div role="tabpanel" {...props} />;
    }

    const isActive = ctx.value === setup.value;
    const hidden = !isActive;
    const tabId = ctx.getTabId(setup.value);

    if (hidden && !setup.keepMounted) {
      return null;
    }

    const dataAttrs = getDataAttributes({
      orientation: ctx.orientation,
      hidden,
    });

    return (
      <div
        id={id}
        role="tabpanel"
        aria-labelledby={tabId}
        hidden={hidden || undefined}
        {...dataAttrs}
        {...props}
      />
    );
  };
}

/**
 * Namespace containing all TabsPanel-related types.
 */
export namespace TabsPanel {
  export type Value = TabValue;
  export type Setup = TabsPanelSetup;
  export type Props = TabsPanelProps;
  export type State = TabsPanelState;
}
