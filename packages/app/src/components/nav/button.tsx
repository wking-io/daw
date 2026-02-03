import type { Handle, Props, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";

export function NavButton(_handle: Handle) {
  return (
    props: Props<"button"> & {
      isIcon?: boolean;
      children: RemixNode;
    },
  ) => {
    const { children, class: className, isIcon = false, ...buttonProps } = props;

    return (
      <div class="relative after:pointer-events-none after:absolute after:inset-px after:rounded-[3px] after:shadow-highlight after:shadow-layer-3/40 dark:after:shadow-foreground/5 after:transition origin-left">
        <button
          type="button"
          class={cn(
            "block py-1.5 transition text-xs cursor-pointer bg-layer-2 bg-linear-to-b from-layer-3/30 dark:from-foreground/2 via-layer-2 via-40% to-layer-3/50 dark:to-foreground/5 text-foreground rounded-sm border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 outline-none bg-clip-padding",
            "active:from-layer-1/30 active:via-layer-1/5 active:to-layer-1/15 active:dark:from-layer-1/30 active:dark:via-layer-1/0 active:dark:to-layer-1/15",
            isIcon ? "px-1.5" : "px-3",
            className,
          )}
          {...buttonProps}
        >
          {children}
        </button>
      </div>
    );
  };
}
