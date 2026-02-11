import type { Props } from "@remix-run/component";
import { cn } from "@daw/utils";

export function InsetPanel() {
  return ({ class: classes, children, ...props }: Props<"div">) => {
    return (
      <div
        class={cn(
          "relative overflow-hidden rounded-sm bg-linear-to-b from-neutral-900 via-neutral-800 to-neutral-600 p-px",
          classes,
        )}
        {...props}
      >
        <div class="absolute inset-0 rounded-sm bg-linear-[175deg] from-neutral-950 to-neutral-950/0 to-20%" />
        <div class="absolute inset-0 rounded-sm bg-linear-[175deg] from-white/0 from-80% to-white/40" />
        {children}
      </div>
    );
  };
}
