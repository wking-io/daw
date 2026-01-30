import { getAtom } from "@daw/atom-remix";
import type { Handle } from "@remix-run/component";
import { type Tab, tabsAtom } from "../state/tabs";
import { cn } from "../utils/cn";

function TabItem(handle: Handle) {
	const [getTabs, setTabs] = getAtom(handle, tabsAtom);

	return (props: { tabId: Tab["id"] }) => {
		const { openTabs, activeTabId } = getTabs();
		const tab = openTabs.find((t) => t.id === props.tabId);
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
					newActiveId =
						newTabs[closedIndex - 1]?.id ?? newTabs[0]?.id ?? "home";
				}
				return { openTabs: newTabs, activeTabId: newActiveId };
			});
		};

		return (
			<div
				class={cn(
					"flex cursor-pointer items-center gap-2 select-none border-b-2 px-3 py-2",
					isActive
						? "border-blue-500 bg-neutral-800"
						: "border-transparent bg-neutral-900 hover:bg-neutral-850",
				)}
				on={{ click: handleClick }}
			>
				<span
					class={cn(
						"max-w-30 overflow-hidden text-ellipsis whitespace-nowrap text-sm",
						isActive ? "text-white" : "text-neutral-400",
					)}
				>
					{tab.state !== "idle" && <span class="mr-1 text-amber-500">●</span>}
					{tab.name}
				</span>
				<button
					type="button"
					class="flex size-4 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent text-sm leading-none text-neutral-500 hover:bg-neutral-600 hover:text-white"
					on={{ click: handleClose }}
				>
					×
				</button>
			</div>
		);
	};
}

function NewTabButton(_handle: Handle) {
	return (props: { onCreateProject: () => void }) => (
		<button
			type="button"
			class="flex h-full w-8 cursor-pointer items-center justify-center border-none bg-transparent text-lg text-neutral-500 hover:bg-neutral-850 hover:text-white"
			on={{ click: props.onCreateProject }}
		>
			+
		</button>
	);
}

export function TabBar(handle: Handle) {
	const [getTabs] = getAtom(handle, tabsAtom);

	return (props: { onCreateProject: () => void }) => {
		const { openTabs } = getTabs();

		return (
			<div class="flex h-9 items-stretch border-b border-neutral-700 bg-neutral-900">
				{openTabs.map((tab) => (
					<TabItem key={tab.id} tabId={tab.id} />
				))}
				<NewTabButton onCreateProject={props.onCreateProject} />
			</div>
		);
	};
}
