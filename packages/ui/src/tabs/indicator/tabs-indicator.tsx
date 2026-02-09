import type { Handle, Props, RemixNode } from "@remix-run/component";
import { TabsRoot, type TabsRootState, getTabsStateDataAttributes } from "../root/tabs-root";
import { TabsList } from "../list/tabs-list";

/**
 * Setup configuration for the TabsIndicator component.
 */
export interface TabsIndicatorSetup {
  /**
   * Transition speed in pixels per second.
   * @default 800
   */
  speed?: number;
  /**
   * Minimum transition duration in milliseconds.
   * @default 100
   */
  minDuration?: number;
  /**
   * Maximum transition duration in milliseconds.
   * @default 300
   */
  maxDuration?: number;
}

/**
 * Props passed to the TabsIndicator render function.
 */
export interface TabsIndicatorProps extends Props<"span"> {
  class?: string;
  render?: (props: Props<"span">) => RemixNode;
}

/**
 * Position of the active tab indicator.
 */
export interface TabsIndicatorPosition {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Size of the active tab indicator.
 */
export interface TabsIndicatorSize {
  width: number;
  height: number;
}

/**
 * Indicator component that shows the active tab position.
 * Renders a `<span>` element that can be styled to show the active tab.
 * Provides CSS custom properties for positioning.
 *
 * CSS custom properties:
 * - `--active-tab-left`: Left position in pixels
 * - `--active-tab-right`: Right position in pixels
 * - `--active-tab-top`: Top position in pixels
 * - `--active-tab-bottom`: Bottom position in pixels
 * - `--active-tab-width`: Width in pixels
 * - `--active-tab-height`: Height in pixels
 * - `--indicator-duration`: Transition duration in milliseconds
 *
 * @example
 * ```tsx
 * <Tabs.List setup={{}}>
 *   <Tabs.Indicator class="absolute bg-blue-500 h-0.5 bottom-0 transition-all" />
 *   <Tabs.Tab setup={{ value: "tab1" }}>Tab 1</Tabs.Tab>
 *   <Tabs.Tab setup={{ value: "tab2" }}>Tab 2</Tabs.Tab>
 * </Tabs.List>
 * ```
 */
export function TabsIndicator(handle: Handle, setup: TabsIndicatorSetup = {}) {
  const ctx = handle.context.get(TabsRoot);
  const listCtx = handle.context.get(TabsList);

  const speed = setup.speed ?? 800;
  const minDuration = setup.minDuration ?? 100;
  const maxDuration = setup.maxDuration ?? 300;

  // Keep last valid position/size so indicator stays in DOM for CSS transitions
  let lastPosition: TabsIndicatorPosition | null = null;
  let lastSize: TabsIndicatorSize | null = null;
  let transitionDuration = minDuration;

  const calculatePosition = (): {
    position: TabsIndicatorPosition | null;
    size: TabsIndicatorSize | null;
  } => {
    if (!ctx || ctx.value === null) {
      return { position: null, size: null };
    }

    const activeTab = ctx.getTabElement(ctx.value);
    const listElement = listCtx?.listElement;

    if (!activeTab || !listElement) {
      return { position: null, size: null };
    }

    const tabRect = activeTab.getBoundingClientRect();
    const listRect = listElement.getBoundingClientRect();

    const left = tabRect.left - listRect.left + listElement.scrollLeft;
    const top = tabRect.top - listRect.top + listElement.scrollTop;
    const right = listRect.right - tabRect.right;
    const bottom = listRect.bottom - tabRect.bottom;

    return {
      position: { left, right, top, bottom },
      size: { width: tabRect.width, height: tabRect.height },
    };
  };

  const calculateDuration = (
    oldPos: TabsIndicatorPosition | null,
    newPos: TabsIndicatorPosition,
  ): number => {
    if (!oldPos) return minDuration;

    const isHorizontal = ctx?.orientation === "horizontal";
    const distance = isHorizontal
      ? Math.abs(newPos.left - oldPos.left)
      : Math.abs(newPos.top - oldPos.top);

    // duration = distance / speed (convert speed from px/s to px/ms)
    const duration = distance / (speed / 1000);
    return Math.max(minDuration, Math.min(maxDuration, duration));
  };

  // Recalculate after tabs connect to DOM
  handle.queueTask(() => {
    const { position, size } = calculatePosition();
    if (position && size) {
      transitionDuration = calculateDuration(lastPosition, position);
      lastPosition = position;
      lastSize = size;
      handle.update();
    }
  });

  return (props: TabsIndicatorProps) => {
    const { render, class: classes, ...rest } = props;

    if (!ctx) {
      const fallbackProps = { class: classes, ...rest };
      if (render) return render(fallbackProps);
      return <span {...fallbackProps} />;
    }

    const { position, size } = calculatePosition();

    // Update last known position and calculate duration if we have valid values
    if (position && size) {
      transitionDuration = calculateDuration(lastPosition, position);
      lastPosition = position;
      lastSize = size;
    }

    // Only return null if we've never had a valid position
    if (!lastPosition || !lastSize) {
      return null;
    }

    const style = {
      "--active-tab-left": `${lastPosition.left}px`,
      "--active-tab-right": `${lastPosition.right}px`,
      "--active-tab-top": `${lastPosition.top}px`,
      "--active-tab-bottom": `${lastPosition.bottom}px`,
      "--active-tab-width": `${lastSize.width}px`,
      "--active-tab-height": `${lastSize.height}px`,
      "--indicator-duration": `${transitionDuration}ms`,
    };

    const state: TabsRootState = {
      orientation: ctx.orientation,
      activationDirection: ctx.activationDirection,
    };
    const dataAttrs = getTabsStateDataAttributes(state);

    const indicatorProps = {
      role: "presentation" as const,
      "aria-hidden": "true" as const,
      class: classes,
      style,
      ...dataAttrs,
      ...rest,
    };

    if (render) {
      return render(indicatorProps);
    }

    return <span {...indicatorProps} />;
  };
}

/**
 * Namespace containing all TabsIndicator-related types.
 */
export namespace TabsIndicator {
  export type Setup = TabsIndicatorSetup;
  export type Props = TabsIndicatorProps;
  export type Position = TabsIndicatorPosition;
  export type Size = TabsIndicatorSize;
}
