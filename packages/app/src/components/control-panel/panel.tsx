import type { Handle, RemixNode } from "@remix-run/component";
import { TypedEventTarget } from "@remix-run/interaction";
import { Field, Popover } from "@daw/ui";
import { type AsciiLoaderType, asciiOptions, isAsciiLoaderType } from "../ascii-loader";
import { Select } from "./select";
import { Slider } from "./slider";
import { cn } from "@daw/utils";
import {
  type OrbitRingsConfig,
  type OrbitEasing,
  defaultOrbitRingsConfig,
  orbitEasingOptions,
} from "@daw/ui/icons";

const outerRadiusOptions = ["12", "14", "16", "18", "20"];
const middleRadiusOptions = ["4", "6", "8", "10", "12"];
const innerRadiusOptions = ["2", "3", "4", "5", "6"];

class ControlPanelContext extends TypedEventTarget<{ change: Event }> {
  #loaderType: AsciiLoaderType = "dots";
  #orbitRingsConfig: OrbitRingsConfig = { ...defaultOrbitRingsConfig };

  get loaderType() {
    return this.#loaderType;
  }

  get orbitRingsConfig() {
    return this.#orbitRingsConfig;
  }

  setLoaderType(value: AsciiLoaderType) {
    this.#loaderType = value;
    this.dispatchEvent(new Event("change"));
  }

  setOrbitRingsConfig(updates: Partial<OrbitRingsConfig>) {
    this.#orbitRingsConfig = { ...this.#orbitRingsConfig, ...updates };
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
          <Popover.Content class="outline-none bg-linear-to-b from-foreground/50 to-foreground/20 rounded-xl p-px">
            <div class="bg-linear-to-b from-layer-2 to-layer-1 rounded-[11px] p-px">
              <div class="rounded-[10px] bg-layer p-3 flex flex-col gap-3">
                <Field.Root setup={{ name: "loaderType" }} class="flex flex-col gap-1">
                  <Field.Label class="text-xs">Loader Type</Field.Label>
                  <Select
                    setup={{
                      onChange: (value: string) => {
                        if (isAsciiLoaderType(value)) {
                          ctx.setLoaderType(value);
                        }
                      },
                      options: asciiOptions,
                    }}
                    value={ctx.loaderType}
                  />
                </Field.Root>

                <div class="border-t border-foreground/10 pt-3">
                  <p class="text-xs font-medium mb-2">Orbit Rings</p>

                  <div class="flex flex-col gap-2">
                    <Field.Root setup={{ name: "outerRadius" }} class="flex flex-col gap-1">
                      <Field.Label class="text-xs">Outer Radius</Field.Label>
                      <Select
                        setup={{
                          onChange: (value: string) => {
                            ctx.setOrbitRingsConfig({ outerRadius: Number(value) });
                          },
                          options: outerRadiusOptions,
                        }}
                        value={String(ctx.orbitRingsConfig.outerRadius)}
                      />
                    </Field.Root>

                    <Field.Root setup={{ name: "middleRadius" }} class="flex flex-col gap-1">
                      <Field.Label class="text-xs">Middle Radius</Field.Label>
                      <Select
                        setup={{
                          onChange: (value: string) => {
                            ctx.setOrbitRingsConfig({ middleRadius: Number(value) });
                          },
                          options: middleRadiusOptions,
                        }}
                        value={String(ctx.orbitRingsConfig.middleRadius)}
                      />
                    </Field.Root>

                    <Field.Root setup={{ name: "innerRadius" }} class="flex flex-col gap-1">
                      <Field.Label class="text-xs">Inner Radius</Field.Label>
                      <Select
                        setup={{
                          onChange: (value: string) => {
                            ctx.setOrbitRingsConfig({ innerRadius: Number(value) });
                          },
                          options: innerRadiusOptions,
                        }}
                        value={String(ctx.orbitRingsConfig.innerRadius)}
                      />
                    </Field.Root>

                    <Field.Root setup={{ name: "totalDuration" }} class="flex flex-col gap-1">
                      <Field.Label class="text-xs">Total Duration</Field.Label>
                      <Slider
                        setup={{
                          onChange: (value: number) => {
                            ctx.setOrbitRingsConfig({ totalDuration: value });
                          },
                          min: 1000,
                          max: 5000,
                          step: 10,
                          formatValue: (v) => `${v}ms`,
                        }}
                        value={Math.round(ctx.orbitRingsConfig.totalDuration)}
                      />
                    </Field.Root>

                    <Field.Root setup={{ name: "durationRatio" }} class="flex flex-col gap-1">
                      <Field.Label class="text-xs">Linear / Orbit Ratio</Field.Label>
                      <Slider
                        setup={{
                          onChange: (value: number) => {
                            const linearRatio = value / 100;
                            ctx.setOrbitRingsConfig({
                              linearDuration: linearRatio,
                              orbitDuration: 1 - linearRatio,
                            });
                          },
                          min: 5,
                          max: 95,
                          step: 5,
                          formatValue: (v) => `${v}%`,
                        }}
                        value={Math.round(ctx.orbitRingsConfig.linearDuration * 100)}
                      />
                    </Field.Root>

                    <Field.Root setup={{ name: "orbitEasing" }} class="flex flex-col gap-1">
                      <Field.Label class="text-xs">Orbit Easing</Field.Label>
                      <Select
                        setup={{
                          onChange: (value: string) => {
                            ctx.setOrbitRingsConfig({ orbitEasing: value as OrbitEasing });
                          },
                          options: [...orbitEasingOptions],
                        }}
                        value={ctx.orbitRingsConfig.orbitEasing}
                      />
                    </Field.Root>
                  </div>
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
