import { Atom } from "@effect-atom/atom-react";

/** Command/event log for debugging */
export const logsAtom = Atom.make<ReadonlyArray<string>>([]);
