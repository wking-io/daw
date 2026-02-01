import type { Handle, Props, RemixNode } from "@remix-run/component";
import { cn } from "../../utils/cn";

export function Button(_handle: Handle) {
  return (
    props: Props<"button"> & {
      children: RemixNode;
    },
  ) => {
    const { children, class: className, ...buttonProps } = props;

    return (
      <div class="relative before:pointer-events-none before:absolute before:-inset-1 before:rounded-[11px] before:border before:border-sky-5 before:ring-2 before:ring-sky-5/20 before:opacity-0 before:transition focus-within:before:opacity-100 after:pointer-events-none after:absolute after:inset-px after:rounded-[7px] after:shadow-highlight dark:after:shadow-foreground/5 after:transition dark:focus-within:after:shadow-sky-5/20">
        <button
          type="button"
          class={cn(
            "relative text-sm cursor-pointer bg-layer-2 bg-linear-to-b from-foreground/0 to-foreground/2 hover:from-foreground/2 text-foreground px-3.5 py-2 rounded-lg border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 outline-none bg-clip-padding text-shadow-xs text-shadow-oatmeal-12",
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
