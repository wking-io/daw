import type { Handle, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";

export function ControlBarRoot(_handle: Handle) {
  return (props: { children?: RemixNode }) => (
    <div
      data-tauri-drag-region
      class="drag-region fixed top-0 left-0 right-0 h-[46px] w-full flex pl-[92px] z-1000 select-none"
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
