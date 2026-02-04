import { Atom } from "@daw/atom-remix";
import * as Ids from "@daw/core/ids";

export interface Tab {
  id: "home" | Ids.ProjectId;
  name: string;
  state: "idle" | "dirty" | "error" | "loading" | "pending" | "working";
}

const homeTab: Tab = {
  id: "home",
  name: "Home",
  state: "idle",
};

export interface TabsState {
  openTabs: Array<Tab>;
  activeTabId: Tab["id"];
}

const initialState: TabsState = {
  openTabs: [homeTab],
  activeTabId: "home",
};

export const tabsAtom = Atom.make(initialState);
