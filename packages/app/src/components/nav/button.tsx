import type { Props } from "@remix-run/component";
import { cn } from "@daw/utils";
import { Dialog } from "../dialog";

const wrapperClass =
  "relative after:pointer-events-none after:absolute after:inset-px after:rounded-[3px] after:shadow-highlight after:shadow-layer-3/40 dark:after:shadow-foreground/5 after:transition origin-left";
const buttonClass =
  "block py-1.5 transition text-xs cursor-pointer bg-layer-2 bg-linear-to-b from-layer-3/30 dark:from-foreground/2 via-layer-2 via-40% to-layer-3/50 dark:to-foreground/5 text-foreground rounded-sm border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 outline-none bg-clip-padding";
const buttonActiveClass =
  "active:from-layer-1/30 active:via-layer-1/5 active:to-layer-1/15 active:dark:from-layer-1/30 active:dark:via-layer-1/0 active:dark:to-layer-1/15";

export function NavButton() {
  return (
    props: Props<"button"> & {
      isIcon?: boolean;
    },
  ) => {
    const { children, class: classes, isIcon = false, ...buttonProps } = props;

    return (
      <div class={wrapperClass}>
        <button
          type="button"
          class={cn(buttonClass, buttonActiveClass, isIcon ? "px-1.5" : "px-3", classes)}
          {...buttonProps}
        >
          {children}
        </button>
      </div>
    );
  };
}

export function NavCreateButton() {
  return (props: Props<"button">) => {
    const { class: classes, ...rest } = props;

    return (
      <div class={wrapperClass}>
        <Dialog.Trigger
          type="button"
          class={cn(buttonClass, buttonActiveClass, "px-1.5", classes)}
          {...rest}
        >
          <span class="block -mt-0.5 px-[3px]">+</span>
        </Dialog.Trigger>
      </div>
    );
  };
}
