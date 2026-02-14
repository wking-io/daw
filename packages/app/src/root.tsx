import { getAtom, getAtomValue, RegistryProvider, Result } from "@daw/atom-remix";
import type { Handle, RemixNode } from "@remix-run/component";
import { healthWithRetryAtom } from "./api/health";
import { AppLoad } from "./components/app-load";
import { ControlBar } from "./components/control-bar";
import { ControlPanel } from "./components/control-panel/panel";
import { Indicator } from "./components/nav/indicator";
import { Dialog, Tabs, type TabValue } from "@daw/ui";
import { type Tab as TTab, tabsAtom } from "./state/tabs";
import { CloseTrigger, Tab } from "./components/nav/tab";
import { CreateProjectDialog } from "./project/create-dialog";
import { AddIcon, CloseIcon, HomeIcon, StatusIcon } from "@daw/ui/icons";
import { cn } from "@daw/utils";
import { Button } from "./components/button";
import { TimelineRoot } from "./timeline/components/timeline-root";
import {
  NavigatorCanvas,
  NavigatorTrack,
  ProjectionCanvas,
  ProjectionContent,
  ProjectionTrackList,
  RulerCanvas,
  ZoomWindow,
} from "./timeline/components";
import { NavigatorRoot } from "./timeline/components/navigator-root";
import { ProjectionRoot } from "./timeline/components/projection-root";
import { demoDawData } from "./timeline/demo/daw-data";
import type { UIAction, UIState, RulerSettings } from "./timeline/renderers/timeline/types";

type Theme = "light" | "dark";

// Type declaration for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      arch: string;
      onCloseActiveTab: (callback: () => void) => () => void;
    };
  }
}

export function Root(handle: Handle<{ theme: Theme }>) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let theme: Theme = media.matches ? "dark" : "light";
  handle.context.set({ theme });
  document.body.classList.toggle("dark", theme === "dark");

  handle.on(media, {
    change: (event: MediaQueryListEvent) => {
      theme = event.matches ? "dark" : "light";
      handle.context.set({ theme });
      document.body.classList.toggle("dark", theme === "dark");
      handle.update();
    },
  });

  return () => (
    <div class="flex-1">
      <RegistryProvider>
        <ControlPanel.Root>
          <App />
        </ControlPanel.Root>
      </RegistryProvider>
    </div>
  );
}

function App(handle: Handle) {
  const getHealthResult = getAtomValue(handle, healthWithRetryAtom);
  const ctx = handle.context.get(ControlPanel.Root);
  handle.on(ctx, { change: () => handle.update() });

  return () => {
    return Result.builder(getHealthResult())
      .onInitial(() => <AppLoad message="Connecting to server..." />)
      .onSuccess(() => <MainApp />)
      .onFailure(() => <AppLoad message="Starting server..." />)
      .render() as RemixNode;
  };
}

function ProjectTabIcon(handle: Handle) {
  const ctx = handle.context.get(ControlPanel.Root);
  handle.on(ctx, { change: () => handle.update() });

  // Generate a key from config to force remount when settings change (restarts animation)
  const configKey = () => JSON.stringify(ctx.statusIconConfig);

  return () => (
    <StatusIcon
      key={configKey()}
      size="custom"
      class={cn(
        "size-8 -m-2 group-data-active:opacity-100",
        ctx.statusIconConfig.innerPosition === "notification"
          ? "dark:text-pistachio-5 text-pistachio-6 opacity-80"
          : "text-foreground-muted opacity-50",
      )}
      config={ctx.statusIconConfig}
    />
  );
}

function MainApp(handle: Handle) {
  const [getTabs, setTabs] = getAtom(handle, tabsAtom);
  let selectedClipId: string | null = null;

  // Ruler debug settings
  let rulerSettings: RulerSettings = {};

  const handleRulerSetting = (key: keyof RulerSettings, value: number) => {
    rulerSettings = { ...rulerSettings, [key]: value };
    handle.update();
  };

  const handleUIAction = (action: UIAction) => {
    switch (action.type) {
      case "select-clip":
        selectedClipId = action.clipId;
        handle.update();
        break;
    }
  };

  const handleTabChange = (newTabId: TabValue) => {
    const tabId = newTabId as TTab["id"];
    setTabs((tabs) => {
      const updatedTabs: TTab[] = tabs.openTabs.map((tab) =>
        tab.id === tabId && tab.state === "pending" ? { ...tab, state: "dirty" } : tab,
      );
      return {
        openTabs: updatedTabs,
        activeTabId: tabId,
      };
    });
  };

  const handleTabClose = (value: TabValue) => {
    const tabId = value as TTab["id"];
    // Don't allow closing the home tab
    if (tabId === "home") return;

    setTabs((tabs) => {
      const idx = tabs.openTabs.findIndex((t) => t.id === tabId);
      const newTabs = tabs.openTabs.filter((t) => t.id !== tabId);

      // Determine new active tab if closing the active one
      let newActiveId = tabs.activeTabId;
      if (tabs.activeTabId === tabId) {
        // Prefer next tab, fall back to previous, then home
        newActiveId = newTabs[idx]?.id ?? newTabs[idx - 1]?.id ?? "home";
      }

      return { openTabs: newTabs, activeTabId: newActiveId };
    });
  };

  // Close active tab on Cmd/Ctrl+W (via Electron IPC)
  const closeActiveTab = () => {
    const { activeTabId } = getTabs();
    handleTabClose(activeTabId);
  };

  // Register Electron IPC listener for close-active-tab
  if (window.electronAPI?.onCloseActiveTab) {
    const unsubscribe = window.electronAPI.onCloseActiveTab(closeActiveTab);
    handle.signal.addEventListener("abort", unsubscribe);
  }

  return () => {
    const { openTabs, activeTabId } = getTabs();
    const dawUIState: UIState = { selectedClipId };
    const dawData = { ...demoDawData, rulerSettings };

    const gridPx = rulerSettings.minSpacing ?? 20;
    const labelPx = rulerSettings.minLabelSpacing ?? 80;
    const maxSub = rulerSettings.maxSubdivisions ?? 128;
    const maxSubPow = Math.round(Math.log2(maxSub));

    return (
      <CreateProjectDialog.Root>
        <Tabs.Root
          setup={{ closable: true }}
          value={activeTabId}
          onValueChange={handleTabChange}
          onTabClose={handleTabClose}
          class="flex flex-col flex-1 overflow-hidden"
        >
          <ControlBar.Root>
            <ControlBar.Content class="py-1 no-drag">
              <div class="flex items-center gap-1">
                <Tabs.List
                  setup={{ activateOnFocus: false }}
                  class={cn(
                    "flex relative bg-layer-1 rounded-sm shadow-recess shadow-foreground/10 dark:shadow-background/40",
                    "before:absolute before:inset-0 before:rounded-sm before:pointer-events-none before:border-[0.5px] before:border-foreground/10 dark:before:border-background/40",
                  )}
                >
                  {openTabs.map((t) => (
                    <Tab key={t.id} setup={{ value: t.id }}>
                      {t.id === "home" ? (
                        <span class="block pl-0.5 py-1">
                          <HomeIcon size="xs" />
                        </span>
                      ) : (
                        <>
                          <ProjectTabIcon />
                          {t.name}
                          <CloseTrigger aria-label={`Close ${t.name} tab`}>
                            <CloseIcon size="xs" />
                          </CloseTrigger>
                        </>
                      )}
                    </Tab>
                  ))}
                  <Indicator />
                </Tabs.List>
                <div class="flex relative bg-layer-1 rounded-[5px] shadow-recess">
                  <Dialog.Trigger
                    render={(triggerProps) => (
                      <Button setup={{ isIcon: true }} {...triggerProps}>
                        <AddIcon size="xs" />
                      </Button>
                    )}
                  />
                </div>
              </div>
            </ControlBar.Content>
            <ControlBar.Content class="ml-auto pr-1 py-1">
              <ControlPanel.Content class="no-drag" />
            </ControlBar.Content>
          </ControlBar.Root>

          {openTabs.map((tab) => (
            <Tabs.Panel setup={{ value: tab.id }}>
              <div class="mt-4">
                <TimelineRoot>
                  <div
                    class={cn(
                      "user-select-none relative bg-layer-1 shadow-recess shadow-foreground/10 dark:shadow-background/40",
                      "before:absolute before:inset-0 before:pointer-events-none before:border-y-[0.5px] before:border-foreground/10 dark:before:border-background/40",
                    )}
                  >
                    <NavigatorRoot class="relative h-full w-full overflow-hidden">
                      <NavigatorTrack>
                        <NavigatorCanvas data={dawData} state={dawUIState} />
                        <ZoomWindow />
                      </NavigatorTrack>
                    </NavigatorRoot>
                  </div>

                  <ProjectionRoot>
                    <RulerCanvas
                      timeSignature={dawData.timeSignature}
                      minSpacing={rulerSettings.minSpacing}
                      minLabelSpacing={rulerSettings.minLabelSpacing}
                      maxSubdivisions={rulerSettings.maxSubdivisions}
                    />
                    <div
                      class={cn(
                        "sticky left-0 user-select-none relative bg-layer-1 shadow-recess shadow-foreground/10 dark:shadow-background/40",
                        "before:absolute before:inset-0 before:pointer-events-none before:border-y-[0.5px] before:border-foreground/10 dark:before:border-background/40",
                      )}
                    >
                      <ProjectionContent>
                        <ProjectionCanvas data={dawData} state={dawUIState} fitToHeight={true} />
                        <ProjectionTrackList
                          data={dawData}
                          state={dawUIState}
                          dispatch={handleUIAction}
                        />
                      </ProjectionContent>
                    </div>
                  </ProjectionRoot>
                </TimelineRoot>

                <div class="flex items-center gap-6 px-4 py-2 text-xs text-foreground-muted font-mono">
                  <label class="flex items-center gap-2">
                    Grid {gridPx}px
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      value={gridPx}
                      on={{
                        input: (e: Event) =>
                          handleRulerSetting(
                            "minSpacing",
                            Number((e.target as HTMLInputElement).value),
                          ),
                      }}
                      class="w-24"
                    />
                  </label>
                  <label class="flex items-center gap-2">
                    Label {labelPx}px
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="1"
                      value={labelPx}
                      on={{
                        input: (e: Event) =>
                          handleRulerSetting(
                            "minLabelSpacing",
                            Number((e.target as HTMLInputElement).value),
                          ),
                      }}
                      class="w-24"
                    />
                  </label>
                  <label class="flex items-center gap-2">
                    Subdivisions {maxSub}
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="1"
                      value={maxSubPow}
                      on={{
                        input: (e: Event) =>
                          handleRulerSetting(
                            "maxSubdivisions",
                            Math.pow(2, Number((e.target as HTMLInputElement).value)),
                          ),
                      }}
                      class="w-24"
                    />
                  </label>
                </div>
              </div>
            </Tabs.Panel>
          ))}

          <CreateProjectDialog.Popup />
        </Tabs.Root>
      </CreateProjectDialog.Root>
    );
  };
}
