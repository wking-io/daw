import type { Handle, RemixNode } from "@remix-run/component";
import { cn } from "../utils/cn";

export function ControlBarRoot(_handle: Handle) {
  return (props: { children?: RemixNode }) => (
    <div
      data-tauri-drag-region
      class="fixed top-0 left-0 right-0 h-8 w-full flex pl-20 z-1000 select-none"
    >
      {props.children}
    </div>
  );
}

export function ControlBarContent(_handle: Handle) {
  return (props: { children?: RemixNode; class?: string }) => (
    <div class={cn("flex", props.class)}>{props.children}</div>
  );
}

export const ControlBar = {
  Root: ControlBarRoot,
  Content: ControlBarContent,
};
