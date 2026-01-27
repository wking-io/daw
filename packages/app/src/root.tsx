import { Atom, getAtom, getAtomValue, RegistryProvider } from "@daw/atom-remix";

import type { Handle, RemixNode } from "@remix-run/component";
import { Effect, Schedule } from "effect";
import { ApiClient } from "./api/client";
import { healthWithRetryAtom } from "./api/health";
import { AppLoad } from "./components/app-load";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { ControlPanel } from "./components/control-panel/panel";
import { ProjectListView } from "./components/ProjectListView";
import { ProjectView } from "./components/ProjectView";
import { TabBar } from "./components/TabBar";
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
		<div class="h-screen font-sans text-foreground bg-background">
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
		console.log("loaderType", ctx.loaderType);
		return (
			<>
				<ControlPanel.Content />
				<AppLoad
					message="Connecting to server..."
					loaderType={ctx.loaderType}
				/>
				;
			</>
		);
		// return Result.builder(getHealthResult())
		// 	.onInitial(() => <AppLoad message="Connecting to server..." />)
		// 	.onSuccess(() => <MainApp />)
		// 	.onFailure(() => <AppLoad message="Starting server..." />)
		// 	.render() as RemixNode;
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
				{hasTabs && (
					<TabBar
						setup={{ onCreateProject: openCreateDialog }}
						onCreateProject={openCreateDialog}
					/>
				)}

				<div css={{ flex: 1, overflow: "hidden" }}>
					{activeTabId ? (
						<ProjectView
							setup={{ projectId: activeTabId }}
							projectId={activeTabId}
						/>
					) : (
						<ProjectListView
							setup={{ onCreateProject: openCreateDialog }}
							onCreateProject={openCreateDialog}
						/>
					)}
				</div>

				{showCreateDialog && (
					<CreateProjectDialog
						setup={{ onClose: closeCreateDialog }}
						onClose={closeCreateDialog}
					/>
				)}
			</>
		);
	};
}
