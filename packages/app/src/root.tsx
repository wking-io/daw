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
import type { TransportState } from "./timeline/components/timeline-root";
import {
  NavigatorCanvas,
  NavigatorTrack,
  PlayheadLine,
  ProjectionCanvas,
  ProjectionContent,
  ProjectionTrackList,
  RulerCanvas,
  ZoomWindow,
} from "./timeline/components";
import { NavigatorRoot } from "./timeline/components/navigator-root";
import { ProjectionRoot } from "./timeline/components/projection-root";
import { demoProject } from "./timeline/demo/daw-data";
import * as ProjectView from "@daw/core/domain/project-view";
import * as Clip from "@daw/core/domain/clip";
import * as SI from "@daw/core/lib/spatial-index";
import * as Span from "@daw/core/lib/span";
import * as N from "@daw/core/lib/numeric";
import * as QN from "@daw/core/lib/qn";
import * as Sec from "@daw/core/lib/sec";
import { formatPositionFull, computeBarSize, computeBeatSize } from "@daw/core/lib/ruler";
import type { UIAction, UIState, TimelineData } from "./timeline/renderers/timeline/types";

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
    <RegistryProvider>
      <ControlPanel.Root>
        <App />
      </ControlPanel.Root>
    </RegistryProvider>
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

  // Build view once from demo data
  const demoView = ProjectView.fromProject(demoProject);

  // ---------------------------------------------------------------------------
  // Transport state
  // ---------------------------------------------------------------------------
  const bpm = demoProject.bpm;
  let playing = false;
  let playheadPos: QN.QN = QN.zero;
  let followEnabled = true;
  let rafId = 0;
  let playStartWallTime = 0;
  let playStartQN: QN.QN = QN.zero;

  function tick() {
    if (!playing) return;
    const elapsedMs = performance.now() - playStartWallTime;
    const elapsedSec = Sec.Sec(elapsedMs / 1000);
    const elapsedQN = Sec.toQN(elapsedSec, bpm);
    playheadPos = N.add(playStartQN, elapsedQN);
    handle.update();
    rafId = requestAnimationFrame(tick);
  }

  const transport: TransportState = {
    get isPlaying() {
      return playing;
    },
    get playheadPosition() {
      return playheadPos;
    },
    get follow() {
      return followEnabled;
    },
    get bpm() {
      return bpm;
    },
    setPlayheadPosition(pos: QN.QN) {
      playheadPos = N.max(pos, QN.zero);
      if (playing) {
        // Reset rAF anchor so playback continues from new position
        playStartWallTime = performance.now();
        playStartQN = playheadPos;
      }
      handle.update();
    },
    togglePlay() {
      playing = !playing;
      if (playing) {
        playStartWallTime = performance.now();
        playStartQN = playheadPos;
        rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
      }
      handle.update();
    },
    toggleFollow() {
      followEnabled = !followEnabled;
      handle.update();
    },
    disableFollow() {
      if (!followEnabled) return;
      followEnabled = false;
      handle.update();
    },
  };

  // Space key toggles playback
  handle.on(document, {
    keydown: (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        // Don't interfere with input fields
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        transport.togglePlay();
      }
    },
  });

  // Cleanup rAF on unmount
  handle.signal.addEventListener("abort", () => {
    cancelAnimationFrame(rafId);
  });

  const handleUIAction = (action: UIAction) => {
    switch (action.type) {
      case "select-clip":
        selectedClipId = action.clipId;
        handle.update();
        break;
      case "commit-clip-move": {
        const clip = demoView.clipById.get(action.clipId);
        const targetTrack = demoView.trackById.get(action.newTrackId);
        if (!clip || !targetTrack) break;

        // Resolve overlaps on the target track
        const delta = N.subtract(action.newStart, clip.span.start);
        const movedSpan = Span.move(clip.span, delta);
        const overlappingIds = SI.query(demoView.clipIndex, action.newTrackId, movedSpan);
        for (const id of overlappingIds) {
          if (id === action.clipId) continue;
          const existing = demoView.clipById.get(id);
          if (!existing) continue;
          for (const event of Clip.resolveOverlap(existing, movedSpan)) {
            ProjectView.applyEvent(demoView, event);
          }
        }

        // Apply the move (use branded IDs from the view entities)
        ProjectView.applyEvent(demoView, {
          t: "clip.moved",
          clipId: clip.id,
          start: action.newStart,
          ...(targetTrack.id !== clip.trackId && { trackId: targetTrack.id }),
        });

        handle.update();
        break;
      }
      case "commit-clip-resize": {
        const clip = demoView.clipById.get(action.clipId);
        if (!clip) break;

        // Resolve overlaps on the same track
        const overlappingIds = SI.query(demoView.clipIndex, clip.trackId, action.span);
        for (const id of overlappingIds) {
          if (id === action.clipId) continue;
          const existing = demoView.clipById.get(id);
          if (!existing) continue;
          for (const event of Clip.resolveOverlap(existing, action.span)) {
            ProjectView.applyEvent(demoView, event);
          }
        }

        ProjectView.applyEvent(demoView, {
          t: "clip.resized",
          clipId: clip.id,
          span: action.span,
        });

        handle.update();
        break;
      }
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
    const dawData: TimelineData = { project: demoProject, view: demoView };

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
            <ControlBar.Content class="ml-auto pr-1 py-1 no-drag">
              <div class="flex items-center gap-1.5">
                <button
                  on={{ click: () => transport.togglePlay() }}
                  class={cn(
                    "px-2 py-0.5 rounded text-[11px] font-medium",
                    "bg-layer-1 shadow-recess shadow-foreground/10 dark:shadow-background/40",
                    "before:absolute before:inset-0 before:rounded before:pointer-events-none before:border-[0.5px] before:border-foreground/10 dark:before:border-background/40",
                    "relative",
                  )}
                >
                  {transport.isPlaying ? "Stop" : "Play"}
                </button>
                <span class="tabular-nums text-[11px] font-mono text-foreground-muted min-w-[3.5rem] text-center">
                  {formatPositionFull(
                    Number(transport.playheadPosition),
                    computeBeatSize(demoProject.timeSignature),
                    computeBarSize(demoProject.timeSignature),
                  )}
                </span>
                <button
                  on={{ click: () => transport.toggleFollow() }}
                  class={cn(
                    "px-2 py-0.5 rounded text-[11px] font-medium relative",
                    "shadow-recess shadow-foreground/10 dark:shadow-background/40",
                    "before:absolute before:inset-0 before:rounded before:pointer-events-none before:border-[0.5px] before:border-foreground/10 dark:before:border-background/40",
                    transport.follow
                      ? "bg-layer-3 text-foreground"
                      : "bg-layer-1 text-foreground-muted",
                  )}
                >
                  Follow
                </button>
              </div>
            </ControlBar.Content>
          </ControlBar.Root>

          {openTabs.map((tab) => (
            <Tabs.Panel setup={{ value: tab.id }} class="flex-1">
              <TimelineRoot transport={transport} class="h-[50dvh] flex flex-col">
                <div
                  class={cn(
                    "user-select-none relative bg-background shadow-recess shadow-foreground/10 dark:shadow-background/40",
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

                <ProjectionRoot class="flex flex-col">
                  <RulerCanvas timeSignature={dawData.project.timeSignature} class="shrink-0" />
                  <div
                    class={cn(
                      "sticky left-0 user-select-none relative bg-background overflow-hidden min-h-0",
                      "after:absolute after:inset-0 after:shadow-recess after:shadow-foreground/10 dark:after:shadow-background/40 after:pointer-events-none after:z-10",
                      "before:absolute before:inset-0 before:pointer-events-none before:border-y-[0.5px] before:border-foreground/10 dark:before:border-background/40 before:z-20",
                    )}
                  >
                    <div data-vertical-scroll class="overflow-y-auto no-scrollbar h-full">
                      <ProjectionContent data={dawData}>
                        <ProjectionCanvas data={dawData} state={dawUIState} />
                        <ProjectionTrackList
                          data={dawData}
                          state={dawUIState}
                          dispatch={handleUIAction}
                        />
                        <PlayheadLine />
                      </ProjectionContent>
                    </div>
                  </div>
                </ProjectionRoot>
              </TimelineRoot>
            </Tabs.Panel>
          ))}

          <CreateProjectDialog.Popup />
        </Tabs.Root>
      </CreateProjectDialog.Root>
    );
  };
}
