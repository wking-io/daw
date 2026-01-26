import { getAtom } from "@daw/atom-remix";
import type { Ids } from "@daw/core";
import type { Handle } from "@remix-run/component";
import { tabsAtom } from "../state/tabs";

type ProjectId = Ids.ProjectId;

function TabItem(handle: Handle, _setupProps: { tabId: ProjectId }) {
	const [getTabs, setTabs] = getAtom(handle, tabsAtom);

	return (renderProps: { tabId: ProjectId }) => {
		const { openTabs, activeTabId } = getTabs();
		const tab = openTabs.find((t) => t.id === renderProps.tabId);
		if (!tab) return null;

		const isActive = tab.id === activeTabId;

		const handleClick = () => {
			setTabs((current) => ({ ...current, activeTabId: tab.id }));
		};

		const handleClose = (e: Event) => {
			e.stopPropagation();
			setTabs((current) => {
				const newTabs = current.openTabs.filter((t) => t.id !== tab.id);
				let newActiveId = current.activeTabId;
				if (current.activeTabId === tab.id) {
					const closedIndex = current.openTabs.findIndex(
						(t) => t.id === tab.id,
					);
					newActiveId = newTabs[closedIndex - 1]?.id ?? newTabs[0]?.id ?? null;
				}
				return { openTabs: newTabs, activeTabId: newActiveId };
			});
		};

		return (
			<div
				css={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 12px",
					backgroundColor: isActive ? "#2d2d2d" : "#1a1a1a",
					borderBottom: isActive
						? "2px solid #3b82f6"
						: "2px solid transparent",
					cursor: "pointer",
					userSelect: "none",
					"&:hover": {
						backgroundColor: isActive ? "#2d2d2d" : "#252525",
					},
				}}
				on={{ click: handleClick }}
			>
				<span
					css={{
						fontSize: "13px",
						color: isActive ? "#fff" : "#999",
						maxWidth: "120px",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{tab.hasUnsavedChanges && (
						<span css={{ color: "#f59e0b", marginRight: "4px" }}>●</span>
					)}
					{tab.name}
				</span>
				<button
					type="button"
					css={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: "16px",
						height: "16px",
						border: "none",
						backgroundColor: "transparent",
						color: "#666",
						cursor: "pointer",
						borderRadius: "2px",
						fontSize: "14px",
						lineHeight: 1,
						"&:hover": {
							backgroundColor: "#444",
							color: "#fff",
						},
					}}
					on={{ click: handleClose }}
				>
					×
				</button>
			</div>
		);
	};
}

function NewTabButton(
	_handle: Handle,
	_setupProps: { onCreateProject: () => void },
) {
	return (renderProps: { onCreateProject: () => void }) => (
		<button
			type="button"
			css={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: "32px",
				height: "100%",
				border: "none",
				backgroundColor: "transparent",
				color: "#666",
				cursor: "pointer",
				fontSize: "18px",
				"&:hover": {
					backgroundColor: "#252525",
					color: "#fff",
				},
			}}
			on={{ click: renderProps.onCreateProject }}
		>
			+
		</button>
	);
}

export function TabBar(
	handle: Handle,
	_setupProps: { onCreateProject: () => void },
) {
	const [getTabs] = getAtom(handle, tabsAtom);

	return (renderProps: { onCreateProject: () => void }) => {
		const { openTabs } = getTabs();

		return (
			<div
				css={{
					display: "flex",
					alignItems: "stretch",
					backgroundColor: "#1a1a1a",
					borderBottom: "1px solid #333",
					height: "36px",
				}}
			>
				{openTabs.map((tab) => (
					<TabItem key={tab.id} setup={{ tabId: tab.id }} tabId={tab.id} />
				))}
				<NewTabButton
					setup={{ onCreateProject: renderProps.onCreateProject }}
					onCreateProject={renderProps.onCreateProject}
				/>
			</div>
		);
	};
}
