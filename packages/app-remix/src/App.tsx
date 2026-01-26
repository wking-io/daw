import {
	getAtom,
	getAtomRefresh,
	getAtomValue,
	RegistryProvider,
	Result,
} from "@daw/atom-remix";

import type { Handle, RemixNode } from "@remix-run/component";
import { ApiClient } from "./api/client";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { ProjectListView } from "./components/ProjectListView";
import { ProjectView } from "./components/ProjectView";
import { TabBar } from "./components/TabBar";
import { tabsAtom } from "./state/tabs";

export function App() {
	return () => (
		<div
			css={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				fontFamily: "system-ui, -apple-system, sans-serif",
				backgroundColor: "#0d0d0d",
				color: "#fff",
			}}
		>
			<RegistryProvider>
				<AppShell />
			</RegistryProvider>
		</div>
	);
}

function AppShell(handle: Handle) {
	let retryCount = 0;
	const maxRetries = 20;
	const retryDelay = 500;

	const healthAtom = ApiClient.query("health", "health", {
		timeToLive: 2000,
	});
	const getHealthResult = getAtomValue(handle, healthAtom);
	const refreshHealth = getAtomRefresh(handle, healthAtom);

	const scheduleRetry = () => {
		if (retryCount < maxRetries) {
			retryCount++;
			setTimeout(() => {
				refreshHealth();
				handle.update();
			}, retryDelay);
		}
	};

	return () => {
		return Result.builder(getHealthResult())
			.onInitial(() => (
				<LoadingScreen
					setup={{ message: "Connecting to server..." }}
					message="Connecting to server..."
				/>
			))
			.onSuccess((health) => {
				if (!health.healthy) {
					return (
						<LoadingScreen
							setup={{ message: "Server not healthy. Retrying..." }}
							message="Server not healthy. Retrying..."
						/>
					);
				}
				return <MainApp />;
			})
			.onFailure(() => {
				scheduleRetry();
				const msg = `Starting server... (attempt ${retryCount}/${maxRetries})`;
				return <LoadingScreen setup={{ message: msg }} message={msg} />;
			})
			.render() as RemixNode;
	};
}

function LoadingScreen(_handle: Handle, _setupProps: { message: string }) {
	return (renderProps: { message: string }) => (
		<div
			css={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: "100%",
				gap: "16px",
			}}
		>
			<div
				css={{
					width: "32px",
					height: "32px",
					border: "3px solid #333",
					borderTopColor: "#3b82f6",
					borderRadius: "50%",
					animation: "spin 1s linear infinite",
				}}
			/>
			<style>
				{`
					@keyframes spin {
						to { transform: rotate(360deg); }
					}
				`}
			</style>
			<p css={{ color: "#666", fontSize: "14px" }}>{renderProps.message}</p>
		</div>
	);
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
