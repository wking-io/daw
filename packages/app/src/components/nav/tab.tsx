import { Tabs } from "@daw/ui/tabs";
import { cn } from "@daw/utils";
import type { Handle } from "@remix-run/component";

export function Tab(_handle: Handle, setup: Tabs.Tab.Setup) {
  return (props: Tabs.Tab.Props) => {
    const { children, class: classes, ...buttonProps } = props;
    return (
      <Tabs.Tab
        setup={setup}
        {...buttonProps}
        class={cn(
          classes,
          "p-2.5 focus:outline-none text-xs flex items-center gap-1.5  z-1 text-foreground/50 data-active:text-foreground relative before:absolute before:inset-0 before:border before:border-transparent focus-visible:before:border-sky-5 focus-visible:before:ring-2 focus-visible:before:ring-sky-5/20 before:rounded-[4px]",
        )}
      >
        {children}
      </Tabs.Tab>
    );
  };
}

export function CloseTrigger(_handle: Handle) {
  return (props: Tabs.CloseTrigger.Props) => {
    const { children, class: classes, ...buttonProps } = props;
    return (
      <Tabs.CloseTrigger {...buttonProps} class={cn(classes, "ml-1 opacity-50 hover:opacity-100")}>
        {children}
      </Tabs.CloseTrigger>
    );
  };
}
