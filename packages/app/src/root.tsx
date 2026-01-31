import {
	getAtom,
	getAtomValue,
	RegistryProvider,
	Result,
} from "@daw/atom-remix";
import type { Handle, RemixNode } from "@remix-run/component";
import { healthWithRetryAtom } from "./api/health";
import { AppLoad } from "./components/app-load";
import { ControlBar } from "./components/control-bar";
import { ControlPanel } from "./components/control-panel/panel";
import { CreateProjectDialog } from "./components/create-project-dialog";
import { NavButton } from "./components/nav/button";
import { Indicator } from "./components/nav/indicator";
import { ProjectListView } from "./components/project-list-view";
import { ProjectView } from "./components/project-view";
import { Tabs, type TabValue } from "./components/ui/tabs";
import { type Tab, tabsAtom } from "./state/tabs";

type Theme = "light" | "dark";

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
	let showCreateDialog = false;
	const [getTabs, setTabs] = getAtom(handle, tabsAtom);

	const openCreateDialog = () => {
		showCreateDialog = true;
		handle.update();
	};

	const closeCreateDialog = () => {
		showCreateDialog = false;
		handle.update();
	};

	return () => {
		const { openTabs, activeTabId } = getTabs();

		const handleTabChange = (newTabId: TabValue) => {
			const tabId = newTabId as Tab["id"];
			setTabs((tabs) => {
				const updatedTabs: Tab[] = tabs.openTabs.map((tab) =>
					tab.id === tabId && tab.state === "pending"
						? { ...tab, state: "dirty" }
						: tab,
				);
				return {
					openTabs: updatedTabs,
					activeTabId: tabId,
				};
			});
		};

		return (
			<Tabs.Root
				value={activeTabId}
				onValueChange={handleTabChange}
				class="flex flex-col flex-1 overflow-hidden"
			>
				<ControlBar.Root>
					<ControlBar.Content class="py-1">
						<div class="flex items-center h-6 gap-1">
							<Tabs.List
								setup={{ activateOnFocus: false }}
								class="flex relative bg-layer-1 rounded-[5px] shadow-recess"
							>
								{openTabs.map((t) => (
									<Tabs.Tab
										key={t.id}
										setup={{ value: t.id }}
										class="h-6 px-2.5 focus:outline-none text-xs flex items-center gap-1.5 relative z-1 text-foreground/50 data-active:text-foreground rounded-[5px] focus-visible:ring-1 focus-visible:ring-denim-5/50"
									>
										{t.id === "home" ? (
											<span class="block -mt-0.5">⌂</span>
										) : (
											<>
												<span class="block -mt-0.5">⦿</span>
												{t.name}
											</>
										)}
									</Tabs.Tab>
								))}
								<Indicator />
							</Tabs.List>
							<div class="flex relative bg-layer-1 rounded-[5px] shadow-recess">
								<NavButton
									class="size-6"
									on={{
										click: openCreateDialog,
									}}
								>
									<span class="block -mt-0.5">+</span>
								</NavButton>
							</div>
						</div>
					</ControlBar.Content>
					<ControlBar.Content class="ml-auto pr-1 pt-1">
						<ControlPanel.Content />
					</ControlBar.Content>
				</ControlBar.Root>

				{openTabs.map((tab) => (
					<Tabs.Panel setup={{ value: tab.id }}>
						<div class="flex flex-1 overflow-hidden">
							{tab.id !== "home" ? (
								<ProjectView setup={{ projectId: tab.id }} projectId={tab.id} />
							) : (
								<ProjectListView onCreateProject={openCreateDialog} />
							)}
						</div>
					</Tabs.Panel>
				))}

				{showCreateDialog && (
					<CreateProjectDialog onClose={closeCreateDialog} />
				)}
			</Tabs.Root>
		);
	};
}
