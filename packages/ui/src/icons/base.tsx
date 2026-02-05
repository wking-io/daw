import { cn } from "@daw/utils";
import type { Props } from "@remix-run/component";

const sizes = {
  xs: {
    classes: "size-2",
    strokeWidth: 1.5,
  },
  sm: {
    classes: "size-3",
    strokeWidth: 1.5,
  },
  DEFAULT: {
    classes: "size-4",
    strokeWidth: 1.5,
  },
};

export interface IconProps extends Props<"svg"> {
  size?: keyof typeof sizes;
}

export function BaseIcon() {
  return ({ size = "DEFAULT", class: externalClasses, ...props }: IconProps) => {
    const { classes, strokeWidth } = sizes[size];
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class={cn(classes, externalClasses)}
        stroke-width={strokeWidth}
        stroke="currentColor"
        {...props}
      />
    );
  };
}
