import type { Handle, Props } from "@remix-run/component";
import { TabsRoot, type TabValue, type TabsOrientation } from "../root/TabsRoot";
import { TabsList } from "../list/TabsList";
import { generateId } from "../../utils/generate-id";
import { getDataAttributes } from "../../utils/data-attributes";
import { Button } from "../../button/Button";

/**
 * Setup configuration for the TabsTab component.
 */
export interface TabsTabSetup {
  /**
   * The value that identifies this tab.
   */
  value: TabValue;
  /**
   * Whether the tab is disabled.
   * @default false
   */
  disabled?: boolean;
}

/**
 * Props passed to the TabsTab render function.
 */
export interface TabsTabProps extends Props<"button"> {
  class?: string;
}

/**
 * State of an individual tab.
 */
export interface TabsTabState {
  active: boolean;
  disabled: boolean;
  orientation: TabsOrientation;
  closable: boolean;
}

/**
 * Context value provided by TabsTab for child components like CloseTrigger.
 */
export interface TabsTabContextValue {
  value: TabValue;
  disabled: boolean;
  closable: boolean;
  onClose: () => void;
}

/**
 * Individual tab button component.
 * Renders a `<button>` element with role="tab".
 *
 * @example
 * ```tsx
 * <Tabs.List setup={{}}>
 *   <Tabs.Tab setup={{ value: "tab1" }}>Tab 1</Tabs.Tab>
 *   <Tabs.Tab setup={{ value: "tab2", disabled: true }}>Tab 2</Tabs.Tab>
 * </Tabs.List>
 * ```
 */
export function TabsTab(handle: Handle<TabsTabContextValue>, setup: TabsTabSetup) {
  const ctx = handle.context.get(TabsRoot);
  const listCtx = handle.context.get(TabsList);
  const id = generateId("tab");
  let tabElement: HTMLElement | null = null;

  const isDisabled = setup.disabled ?? false;
  const isClosable = ctx?.closable ?? false;

  const onClose = () => {
    if (isClosable && ctx) {
      ctx.onTabClose(setup.value);
    }
  };

  // Provide context for child components (e.g., CloseTrigger)
  handle.context.set({
    value: setup.value,
    disabled: isDisabled,
    closable: isClosable,
    onClose,
  });

  if (ctx) {
    ctx.registerTab({
      id,
      value: setup.value,
      disabled: isDisabled,
      get element() {
        return tabElement;
      },
    });

    handle.signal.addEventListener("abort", () => {
      ctx.unregisterTab(setup.value);
    });
  }

  return (props: TabsTabProps) => {
    if (!ctx) {
      return <Button role="tab" {...props} />;
    }

    const isActive = ctx.value === setup.value;
    const panelId = ctx.getPanelId(setup.value);

    const dataAttrs = {
      ...getDataAttributes({
        orientation: ctx.orientation,
        active: isActive,
        disabled: isDisabled,
        closable: isClosable,
      }),
    };

    return (
      <Button
        id={id}
        role="tab"
        aria-selected={isActive}
        aria-controls={panelId}
        aria-disabled={isDisabled || undefined}
        disabled={isDisabled}
        tabIndex={isActive ? 0 : -1}
        connect={(el: HTMLButtonElement) => {
          tabElement = el;
          // Trigger indicator recalculation when the active tab connects to DOM
          if (ctx.value === setup.value) {
            ctx.update();
          }
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
            // Delete key closes the tab (WAI-ARIA APG recommended)
            if (event.key === "Delete" && isClosable) {
              event.preventDefault();
              onClose();
            }
          },
          focus: () => {
            if (listCtx?.activateOnFocus && !isDisabled) {
              ctx.onValueChange(setup.value);
            }
          },
        }}
        {...dataAttrs}
        {...props}
      />
    );
  };
}

/**
 * Namespace containing all TabsTab-related types.
 */
export namespace TabsTab {
  export type Value = TabValue;
  export type Setup = TabsTabSetup;
  export type Props = TabsTabProps;
  export type State = TabsTabState;
  export type ContextValue = TabsTabContextValue;
}
