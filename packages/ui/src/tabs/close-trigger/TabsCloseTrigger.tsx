import type { Handle, Props } from "@remix-run/component";
import { TabsTab, type TabsTabContextValue } from "../tab/TabsTab";
import { Button } from "../../button/Button";

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
export function TabsCloseTrigger(handle: Handle) {
  const tabCtx = handle.context.get(TabsTab) as TabsTabContextValue | undefined;

  return (props: TabsCloseTriggerProps) => {
    // If not within a Tab context or tabs aren't closable, render disabled button
    if (!tabCtx || !tabCtx.closable) {
      return <Button disabled tabIndex={-1} {...props} />;
    }

    return (
      <Button
        tabIndex={-1}
        on={{
          click: (event: MouseEvent) => {
            // Prevent the click from activating the parent tab
            event.stopPropagation();
            tabCtx.onClose();
          },
        }}
        {...props}
      />
    );
  };
}

/**
 * Namespace containing all TabsCloseTrigger-related types.
 */
export namespace TabsCloseTrigger {
  export type Props = TabsCloseTriggerProps;
  export type State = TabsCloseTriggerState;
}
