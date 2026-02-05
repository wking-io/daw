import { getAtom, getAtomValue, RegistryProvider, Result } from "@daw/atom-remix";
import type { Handle, RemixNode } from "@remix-run/component";
import { healthWithRetryAtom } from "./api/health";
import { AppLoad } from "./components/app-load";
import { ControlBar } from "./components/control-bar";
import { ControlPanel } from "./components/control-panel/panel";
import { NavCreateButton } from "./components/nav/button";
import { Indicator } from "./components/nav/indicator";
import { ProjectListView } from "./components/project-list-view";
import { ProjectView } from "./components/project-view";
import { Tabs, type TabValue } from "@daw/ui";
import { type Tab as TTab, tabsAtom } from "./state/tabs";
import { CloseTrigger, Tab } from "./components/nav/tab";
import { CreateProjectDialog } from "./project/create";
import { CloseIcon, HomeIcon } from "@daw/ui/icons";

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

function MainApp(handle: Handle) {
  const [getTabs, setTabs] = getAtom(handle, tabsAtom);

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
                  class="flex relative bg-layer-1 rounded-[5px] shadow-recess"
                >
                  {openTabs.map((t) => (
                    <Tab key={t.id} setup={{ value: t.id }}>
                      {t.id === "home" ? (
                        <HomeIcon size="xs" />
                      ) : (
                        <>
                          <span class="block -mt-0.5">⦿</span>
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
                  <NavCreateButton />
                </div>
              </div>
            </ControlBar.Content>
            <ControlBar.Content class="ml-auto pr-1 py-1">
              <ControlPanel.Content class="no-drag" />
            </ControlBar.Content>
          </ControlBar.Root>

          {openTabs.map((tab) => (
            <Tabs.Panel setup={{ value: tab.id }}>
              <div class="flex flex-1 overflow-hidden">
                {tab.id !== "home" ? (
                  <ProjectView setup={{ projectId: tab.id }} projectId={tab.id} />
                ) : (
                  <ProjectListView />
                )}
              </div>
            </Tabs.Panel>
          ))}

          <CreateProjectDialog.Popup />
        </Tabs.Root>
      </CreateProjectDialog.Root>
    );
  };
}
