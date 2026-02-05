import type { Handle, RemixNode } from "@remix-run/component";
import { TypedEventTarget } from "@remix-run/interaction";
import { Field, Popover } from "@daw/ui";
import {
  defaultStatusIconConfig,
  statusEasingOptions,
  type StatusEasing,
  type StatusIconConfig,
} from "@daw/ui/icons";
import { Button } from "../button";
import { Select } from "./select";
import { Slider } from "./slider";
import { cn } from "@daw/utils";

const outerRadiusOptions = ["12", "14", "16", "18", "20"];
const middleRadiusOptions = ["4", "6", "8", "10", "12"];
const innerRadiusOptions = ["2", "3", "4", "5", "6"];
const innerPositionOptions = ["orbit", "center", "notification"];

class ControlPanelContext extends TypedEventTarget<{ change: Event }> {
  #statusIconConfig: StatusIconConfig = { ...defaultStatusIconConfig };

  get statusIconConfig() {
    return this.#statusIconConfig;
  }

  setStatusIconConfig(updates: Partial<StatusIconConfig>) {
    this.#statusIconConfig = { ...this.#statusIconConfig, ...updates };
    this.dispatchEvent(new Event("change"));
  }

  resetStatusIconConfig() {
    this.#statusIconConfig = { ...defaultStatusIconConfig };
    this.dispatchEvent(new Event("change"));
  }
}

export function ControlPanelRoot(handle: Handle<ControlPanelContext>) {
  const ctx = new ControlPanelContext();
  handle.context.set(ctx);

  return (props: { children: RemixNode }) => props.children;
}

export function ControlPanelContent(handle: Handle) {
  const ctx = handle.context.get(ControlPanelRoot);

  handle.on(ctx, { change: () => handle.update() });

  return (props: { class?: string }) => (
    <Popover.Root setup={{}}>
      <Popover.Trigger
        class={cn(
          "flex items-center justify-center font-mono whitespace-pre text-xl text-foreground-muted hover:text-foreground hover:bg-layer rounded-xl size-6",
          props.class,
        )}
      >
        <span class="-mt-0.5 -mr-px">⚙</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Backdrop class="fixed inset-0 z-40" />
        <Popover.Positioner side="bottom" align="end" class="z-50">
          <Popover.Content class="rounded-lg shadow-recess">
            <div
              class={cn(
                "rounded-lg p-6",
                "bg-layer-2 bg-linear-to-b from-layer-3/30 dark:from-foreground/2 via-layer-2 via-40% to-layer-3/50 dark:to-foreground/5",
                "text-foreground border border-oatmeal-12/15 shadow-input shadow-oatmeal-12/5 dark:shadow-oatmeal-12/10",
                "outline-none bg-clip-padding",
                "after:pointer-events-none after:absolute after:inset-px after:rounded-[7px] after:shadow-highlight after:shadow-layer-3/40 dark:after:shadow-foreground/5 after:transition",
                "before:shadow-xl before:absolute before:inset-0 before:pointer-events-none",
              )}
            >
              <div class="flex flex-col gap-3">
                <Field.Root setup={{ name: "outerRadius" }} class="flex flex-col gap-1">
                  <Field.Label class="text-xs">Outer Radius</Field.Label>
                  <Select
                    setup={{
                      onChange: (value: string) => {
                        ctx.setStatusIconConfig({ outerRadius: Number(value) });
                      },
                      options: outerRadiusOptions,
                    }}
                    value={String(ctx.statusIconConfig.outerRadius)}
                  />
                </Field.Root>

                <Field.Root setup={{ name: "middleRadius" }} class="flex flex-col gap-1">
                  <Field.Label class="text-xs">Middle Radius</Field.Label>
                  <Select
                    setup={{
                      onChange: (value: string) => {
                        ctx.setStatusIconConfig({ middleRadius: Number(value) });
                      },
                      options: middleRadiusOptions,
                    }}
                    value={String(ctx.statusIconConfig.middleRadius)}
                  />
                </Field.Root>

                <Field.Root setup={{ name: "innerRadius" }} class="flex flex-col gap-1">
                  <Field.Label class="text-xs">Inner Radius</Field.Label>
                  <Select
                    setup={{
                      onChange: (value: string) => {
                        ctx.setStatusIconConfig({ innerRadius: Number(value) });
                      },
                      options: innerRadiusOptions,
                    }}
                    value={String(ctx.statusIconConfig.innerRadius)}
                  />
                </Field.Root>

                <Field.Root setup={{ name: "innerPosition" }} class="flex flex-col gap-1">
                  <Field.Label class="text-xs">Inner Position</Field.Label>
                  <Select
                    setup={{
                      onChange: (value: string) => {
                        ctx.setStatusIconConfig({
                          innerPosition: value as StatusIconConfig["innerPosition"],
                        });
                      },
                      options: innerPositionOptions,
                    }}
                    value={ctx.statusIconConfig.innerPosition}
                  />
                </Field.Root>

                <Field.Root setup={{ name: "totalDuration" }} class="flex flex-col gap-1">
                  <Field.Label class="text-xs">Total Duration</Field.Label>
                  <Slider
                    setup={{
                      onChange: (value: number) => {
                        ctx.setStatusIconConfig({ totalDuration: value });
                      },
                      min: 1000,
                      max: 5000,
                      step: 10,
                      formatValue: (v) => `${v}ms`,
                    }}
                    value={Math.round(ctx.statusIconConfig.totalDuration)}
                  />
                </Field.Root>

                <Field.Root setup={{ name: "durationRatio" }} class="flex flex-col gap-1">
                  <Field.Label class="text-xs">Linear / Orbit Ratio</Field.Label>
                  <Slider
                    setup={{
                      onChange: (value: number) => {
                        const linearRatio = value / 100;
                        ctx.setStatusIconConfig({
                          linearDuration: linearRatio,
                          orbitDuration: 1 - linearRatio,
                        });
                      },
                      min: 5,
                      max: 95,
                      step: 5,
                      formatValue: (v) => `${v}%`,
                    }}
                    value={Math.round(ctx.statusIconConfig.linearDuration * 100)}
                  />
                </Field.Root>

                <Field.Root setup={{ name: "orbitEasing" }} class="flex flex-col gap-1">
                  <Field.Label class="text-xs">Orbit Easing</Field.Label>
                  <Select
                    setup={{
                      onChange: (value: string) => {
                        ctx.setStatusIconConfig({ orbitEasing: value as StatusEasing });
                      },
                      options: [...statusEasingOptions],
                    }}
                    value={ctx.statusIconConfig.orbitEasing}
                  />
                </Field.Root>

                <div class="flex justify-end pt-2">
                  <Button setup={{ size: "xs" }} on={{ click: () => ctx.resetStatusIconConfig() }}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export const ControlPanel = {
  Root: ControlPanelRoot,
  Content: ControlPanelContent,
};
