import type { Handle, Props } from "@remix-run/component";
import { cn } from "@daw/utils";
import * as Px from "@daw/core/lib/px";
import type { TrackColor } from "../renderers/timeline/types";

export interface ClipProps extends Props<"div"> {
  x: Px.Px;
  y: Px.Px;
  width: Px.Px;
  height: Px.Px;
  color: TrackColor;
  isSelected: boolean;
}

export function Clip(_handle: Handle) {
  return (props: ClipProps) => {
    const { x, y, width, height, color, isSelected, children, ...rest } = props;
    const themeClass = `theme-${color}`;

    return (
      <div
        class={cn("absolute rounded-sm group/clip select-none data-selected:z-10", themeClass)}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
        aria-selected={isSelected}
        {...(isSelected ? { "data-selected": "" } : {})}
        {...rest}
      >
        <div
          class={cn(
            "bg-primary-5 dark:bg-primary-6 size-full rounded-sm flex flex-col overflow-hidden relative",
            isSelected && "ring-1 ring-primary-12 dark:ring-primary-3",
          )}
          {...(isSelected ? { "data-selected": "" } : {})}
        >
          {children}
          <div
            class="absolute left-0 top-0 w-1 h-full cursor-ew-resize z-20"
            data-resize-edge="left"
          />
          <div
            class="absolute right-0 top-0 w-1 h-full cursor-ew-resize z-20"
            data-resize-edge="right"
          />
        </div>
      </div>
    );
  };
}

export function ClipHeader() {
  return ({ children, class: classes, ...props }: Props<"div">) => (
    <div
      class={cn(
        "flex items-center h-[22px] px-1.5 text-xxs shrink-0 text-primary-10 dark:text-primary-0 text-shadow-2xs dark:text-shadow-xs text-shadow-primary-0/30 dark:text-shadow-primary-12/15 cursor-grab",
        classes,
      )}
      {...props}
    >
      <span class="truncate">{children}</span>
    </div>
  );
}

export function ClipContent() {
  return ({
    height,
    isSelected,
    children,
  }: Props<"div"> & { height: Px.Px; isSelected: boolean }) => (
    <div
      class={cn(
        "flex-1 min-h-0 overflow-hidden rounded-sm relative z-10",
        "shadow-recess dark:shadow-background/40",
        "after:pointer-events-none after:absolute after:inset-[0.5px] after:rounded-[3.5px] after:shadow-highlight",
        "shadow-primary-8/40 after:shadow-primary-0/30 dark:after:shadow-primary-0/20 dark:data-selected:after:shadow-primary-0/60",
      )}
      style={{ height: `${height}px` }}
      {...(isSelected ? { "data-selected": "" } : {})}
    >
      <div
        class={cn(
          "bg-primary-5 dark:bg-primary-6 via-primary-5/0 data-selected:via-primary-9/0 dark:via-primary-6/0 data-selected:dark:via-primary-3/0 from-primary-2/10 data-selected:from-primary-5/15 data-selected:dark:from-primary-0/10 via-60% to-primary-2/20 data-selected:to-primary-5/25 data-selected:dark:to-primary-0/20 size-full rounded-sm border-[0.5px] border-primary-8/40 cursor-default bg-linear-to-b dark:border-background/40 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 bg-clip-padding flex flex-col overflow-hidden",
          "data-selected:bg-primary-9 dark:data-selected:bg-primary-3",
        )}
        {...(isSelected ? { "data-selected": "" } : {})}
      >
        {children}
      </div>
    </div>
  );
}
