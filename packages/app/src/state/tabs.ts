import { Atom } from "@daw/atom-remix";
import type * as Ids from "@daw/core/ids";

export type ProjectId = Ids.ProjectId;

export interface Tab {
	id: ProjectId;
	name: string;
	hasUnsavedChanges: boolean;
}

export interface TabsState {
	openTabs: Array<Tab>;
	activeTabId: ProjectId | null;
}

const initialState: TabsState = {
	openTabs: [],
	activeTabId: null,
};

export const tabsAtom = Atom.make(initialState);
