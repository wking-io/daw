import type { Props } from "@remix-run/component";
import { cn } from "@daw/utils";
import { Dialog } from "../dialog";
import { AddIcon } from "@daw/ui/icons";
import { Button } from "../button";
import type { ButtonProps } from "../button";

const wrapperClass =
  "relative after:pointer-events-none after:absolute after:inset-px after:rounded-sm after:shadow-highlight after:shadow-layer-3/40 dark:after:shadow-foreground/5 after:transition origin-left";
const buttonClass =
  "block p-[9px] transition text-xs cursor-pointer bg-layer-2 bg-linear-to-b from-layer-3/30 dark:from-foreground/2 via-layer-2 via-40% to-layer-3/50 dark:to-foreground/5 text-foreground rounded-[5px] border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10 outline-none bg-clip-padding";
const buttonActiveClass =
  "active:from-layer-1/30 active:via-layer-1/5 active:to-layer-1/15 active:dark:from-layer-1/30 active:dark:via-layer-1/0 active:dark:to-layer-1/15";

export function NavButton() {
  return (props: ButtonProps) => {
    return <Button setup={{ size: "sm" }} {...props} />;
  };
}

export function NavCreateButton() {
  return (props: Props<"button">) => {
    const { class: classes, ...rest } = props;

    return (
      <div class={wrapperClass}>
        <Dialog.Trigger type="button" class={cn(buttonClass, buttonActiveClass, classes)} {...rest}>
          <AddIcon size="xs" />
        </Dialog.Trigger>
      </div>
    );
  };
}
