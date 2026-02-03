import type { Handle, Props } from "@remix-run/component";
import { TabsTab, type TabsTabContextValue } from "../tab/TabsTab";

/**
 * Setup configuration for the TabsCloseTrigger component.
 */
export interface TabsCloseTriggerSetup {
  /**
   * Whether the close trigger is disabled.
   * @default false
   */
  disabled?: boolean;
}

/**
 * Props passed to the TabsCloseTrigger render function.
 */
export interface TabsCloseTriggerProps extends Props<"button"> {
  class?: string;
}

/**
 * State of the close trigger.
 */
export interface TabsCloseTriggerState {
  disabled: boolean;
}

function getCloseTriggerDataAttributes(state: TabsCloseTriggerState): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (state.disabled) attrs["data-disabled"] = "";
  return attrs;
}

/**
 * Close trigger component for closable tabs.
 * Renders a `<button>` element that closes the parent tab when clicked.
 * Must be used as a child of Tabs.Tab when the root has closable: true.
 *
 * @example
 * ```tsx
 * <Tabs.Root setup={{ closable: true }} onTabClose={(value) => removeTab(value)}>
 *   <Tabs.List setup={{}}>
 *     <Tabs.Tab setup={{ value: "tab1" }}>
 *       Tab 1
 *       <Tabs.CloseTrigger setup={{}} aria-label="Close Tab 1">
 *         <CloseIcon />
 *       </Tabs.CloseTrigger>
 *     </Tabs.Tab>
 *   </Tabs.List>
 * </Tabs.Root>
 * ```
 */
export function TabsCloseTrigger(handle: Handle, setup: TabsCloseTriggerSetup = {}) {
  const tabCtx = handle.context.get(TabsTab) as TabsTabContextValue | undefined;

  return (props: TabsCloseTriggerProps) => {
    const { class: className, children, ...rest } = props;

    // If not within a Tab context or tabs aren't closable, render disabled button
    if (!tabCtx || !tabCtx.closable) {
      return (
        <button type="button" class={className} disabled tabIndex={-1} data-disabled="" {...rest}>
          {children}
        </button>
      );
    }

    const isDisabled = setup.disabled ?? tabCtx.disabled;
    const state: TabsCloseTriggerState = { disabled: isDisabled };
    const dataAttrs = getCloseTriggerDataAttributes(state);

    return (
      <button
        type="button"
        class={className}
        disabled={isDisabled}
        tabIndex={-1}
        on={{
          click: (event: MouseEvent) => {
            // Prevent the click from activating the parent tab
            event.stopPropagation();
            if (!isDisabled) {
              tabCtx.onClose();
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

/**
 * Namespace containing all TabsCloseTrigger-related types.
 */
export namespace TabsCloseTrigger {
  export type Setup = TabsCloseTriggerSetup;
  export type Props = TabsCloseTriggerProps;
  export type State = TabsCloseTriggerState;
}
