import type { Handle, RemixNode } from "@remix-run/component";
import { PopoverRoot } from "../root/popover-root";

/**
 * Props passed to the PopoverPortal render function.
 */
export interface PopoverPortalProps {
  children: RemixNode;
}

/**
 * Portal component that conditionally renders children when popover is open.
 *
 * @example
 * ```tsx
 * <Popover.Root setup={{}}>
 *   <Popover.Trigger>Open</Popover.Trigger>
 *   <Popover.Portal>
 *     <Popover.Content>Only rendered when open</Popover.Content>
 *   </Popover.Portal>
 * </Popover.Root>
 * ```
 */
export function PopoverPortal(handle: Handle) {
  return (props: PopoverPortalProps) => {
    const ctx = handle.context.get(PopoverRoot);
    if (!ctx?.open) return null;
    return <>{props.children}</>;
  };
}

/**
 * Namespace containing all PopoverPortal-related types.
 */
export namespace PopoverPortal {
  export type Props = PopoverPortalProps;
}
