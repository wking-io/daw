import type { Handle, Props } from "@remix-run/component";
import { cn } from "@daw/utils";
import * as Px from "@daw/core/lib/px";
import type { TrackColor } from "../renderers/timeline/types";

export interface GhostClipProps extends Props<"div"> {
  x: Px.Px;
  y: Px.Px;
  width: Px.Px;
  height: Px.Px;
  color: TrackColor;
  isValid: boolean;
}

export function GhostClip(_handle: Handle) {
  return (props: GhostClipProps) => {
    const { x, y, width, height, color, isValid, ...rest } = props;
    const themeClass = `theme-${color}`;

    return (
      <div
        class={cn(
          "absolute rounded-sm pointer-events-none z-30",
          themeClass,
          isValid ? "opacity-50" : "opacity-30",
        )}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
        {...rest}
      >
        <div
          class={cn(
            "bg-primary-5 dark:bg-primary-6 size-full rounded-sm",
            !isValid && "border-2 border-dashed border-red-8 dark:border-red-6",
          )}
        />
      </div>
    );
  };
}
