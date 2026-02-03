import type { Handle, Props } from "@remix-run/component";
import { TabsRoot, type TabsRootState, getTabsStateDataAttributes } from "../root/TabsRoot";

/**
 * Setup configuration for the TabsList component.
 */
export interface TabsListSetup {
  /**
   * Whether to activate tabs on focus.
   * @default true
   */
  activateOnFocus?: boolean;
  /**
   * Whether keyboard navigation should loop.
   * @default true
   */
  loop?: boolean;
}

/**
 * Props passed to the TabsList render function.
 */
export interface TabsListProps extends Props<"div"> {
  class?: string;
}

/**
 * Context value provided by TabsList.
 */
export interface TabsListContextValue {
  activateOnFocus: boolean;
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  listElement: HTMLElement | null;
  setListElement: (element: HTMLElement | null) => void;
}

/**
 * List component that contains tab buttons.
 * Renders a `<div>` element with role="tablist".
 * Handles keyboard navigation between tabs.
 *
 * @example
 * ```tsx
 * <Tabs.List setup={{ activateOnFocus: true }}>
 *   <Tabs.Tab setup={{ value: "tab1" }}>Tab 1</Tabs.Tab>
 *   <Tabs.Tab setup={{ value: "tab2" }}>Tab 2</Tabs.Tab>
 * </Tabs.List>
 * ```
 */
export function TabsList(handle: Handle<TabsListContextValue>, setup: TabsListSetup = {}) {
  const ctx = handle.context.get(TabsRoot);
  let highlightedIndex = -1;
  let listElement: HTMLElement | null = null;

  const activateOnFocus = setup.activateOnFocus ?? true;
  const loop = setup.loop ?? true;

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

  return (props: TabsListProps) => {
    const { class: className, ...rest } = props;

    if (!ctx) {
      return (
        <div role="tablist" class={className} {...rest}>
          {props.children}
        </div>
      );
    }

    const state: TabsRootState = {
      orientation: ctx.orientation,
      activationDirection: ctx.activationDirection,
    };
    const dataAttrs = getTabsStateDataAttributes(state);

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

/**
 * Namespace containing all TabsList-related types.
 */
export namespace TabsList {
  export type Setup = TabsListSetup;
  export type Props = TabsListProps;
  export type ContextValue = TabsListContextValue;
}
