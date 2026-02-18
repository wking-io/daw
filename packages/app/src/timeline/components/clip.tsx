import type { Handle, RemixNode, Props } from "@remix-run/component";
import { cn } from "@daw/utils";
import * as Px from "@daw/core/lib/px";
import type { UIAction, TrackColor } from "../renderers/timeline/types";

export interface ClipSetup {
  color: TrackColor;
}

export interface ClipProps extends Props<"div"> {
  id: string;
  title: string;
  x: Px.Px;
  y: Px.Px;
  width: Px.Px;
  height: Px.Px;
  compact: boolean;
  titleBarHeight: Px.Px;
  contentHeight: Px.Px;
  isSelected: boolean;
  dispatch: (action: UIAction) => void;
  children?: RemixNode;
}

export function Clip(_handle: Handle, setup: ClipSetup) {
  const themeClass = `theme-${setup.color}`;

  return (props: ClipProps) => {
    const {
      id,
      title,
      x,
      y,
      width,
      height,
      compact,
      titleBarHeight,
      contentHeight,
      isSelected,
      dispatch,
      children,
      ...rest
    } = props;

    const onPointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      dispatch({ type: "select-clip", clipId: id });
    };

    return (
      <div
        class={cn("absolute rounded-sm group/clip select-none", themeClass)}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
        aria-selected={isSelected}
        {...rest}
      >
        <div
          class={cn(
            "bg-primary-5 dark:bg-primary-6 size-full rounded-sm cursor-grab flex flex-col overflow-hidden",
            isSelected && "ring-1 ring-primary-12 dark:ring-primary-3",
          )}
          {...(isSelected ? { "data-selected": "" } : {})}
          on={{ pointerdown: onPointerDown }}
        >
          <div
            class="flex items-center px-1.5 text-xxs shrink-0 text-primary-10 dark:text-primary-0 text-shadow-2xs dark:text-shadow-xs text-shadow-primary-0/30 dark:text-shadow-primary-12/15"
            style={{ height: `${titleBarHeight}px` }}
          >
            <span class="truncate">{title}</span>
          </div>
          {!compact && (
            <div
              class={cn(
                "flex-1 min-h-0 overflow-hidden rounded-sm relative",
                "shadow-recess dark:shadow-background/40",
                "after:pointer-events-none after:absolute after:inset-[0.5px] after:rounded-[3.5px] after:shadow-highlight",
                "shadow-primary-8/40 after:shadow-primary-0/30 dark:after:shadow-primary-0/20 dark:data-selected:after:shadow-primary-0/60",
              )}
              style={{ height: `${contentHeight}px` }}
              {...(isSelected ? { "data-selected": "" } : {})}
            >
              <div
                class={cn(
                  "bg-primary-5 dark:bg-primary-6 via-primary-5/0 data-selected:via-primary-9/0 dark:via-primary-6/0 data-selected:dark:via-primary-3/0 from-primary-2/10 data-selected:from-primary-5/15 data-selected:dark:from-primary-0/10 via-60% to-primary-2/20 data-selected:to-primary-5/25 data-selected:dark:to-primary-0/20 size-full rounded-sm border-[0.5px] border-primary-8/40 cursor-default bg-linear-to-b dark:border-background/40 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 bg-clip-padding flex flex-col overflow-hidden",
                  "data-selected:bg-primary-9 dark:data-selected:bg-primary-3",
                )}
                {...(isSelected ? { "data-selected": "" } : {})}
                on={{ pointerdown: onPointerDown }}
              >
                {children}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
}
