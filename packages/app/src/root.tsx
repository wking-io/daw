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
import { ProjectListView } from "./components/project-list-view";
import { ProjectView } from "./components/project-view";
import { TabBar } from "./components/tab-bar";
import { tabsAtom } from "./state/tabs";

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
	const [getTabs] = getAtom(handle, tabsAtom);

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
		const hasTabs = openTabs.length > 0;

		return (
			<>
				<ControlBar.Root>
					<ControlBar.Content class="pt-1">
						<TabBar onCreateProject={openCreateDialog} />
					</ControlBar.Content>
					<ControlBar.Content class="ml-auto pr-1 pt-1">
						<ControlPanel.Content />
					</ControlBar.Content>
				</ControlBar.Root>
				{hasTabs && <TabBar onCreateProject={openCreateDialog} />}

				<div css={{ flex: 1, overflow: "hidden" }}>
					{activeTabId ? (
						<ProjectView
							setup={{ projectId: activeTabId }}
							projectId={activeTabId}
						/>
					) : (
						<ProjectListView onCreateProject={openCreateDialog} />
					)}
				</div>

				{showCreateDialog && (
					<CreateProjectDialog onClose={closeCreateDialog} />
				)}
			</>
		);
	};
}
