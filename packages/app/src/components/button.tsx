import type { Handle, Props, RemixNode } from "@remix-run/component";
import { cn } from "@daw/utils";
import { Button as BaseButton } from "@daw/ui";
import { Surface, type SurfaceColor } from "./surface";

export type ButtonColor = SurfaceColor;

export interface ButtonSetup {
  color?: ButtonColor;
  isIcon?: boolean;
}

export interface ButtonProps extends Props<"button"> {
  children: RemixNode;
  class?: string;
  forceHover?: boolean;
  forceActive?: boolean;
  forceFocus?: boolean;
}

export function Button(_handle: Handle, setup: ButtonSetup = {}) {
  const color = setup.color ?? "default";
  const padding = setup?.isIcon ? "w-7" : "px-3";

  return (props: ButtonProps) => {
    const { children, class: classes, forceHover, forceActive, forceFocus, ...buttonProps } = props;

    return (
      <Surface.Element
        setup={{ color }}
        class={cn(padding, classes)}
        forceHover={forceHover}
        forceActive={forceActive}
        forceFocus={forceFocus}
        render={({ class: surfaceClass }) => (
          <BaseButton class={surfaceClass} {...buttonProps}>
            {children}
          </BaseButton>
        )}
      />
    );
  };
}
