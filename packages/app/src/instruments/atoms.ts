import type { Patches } from "@daw/contract";
import { Atom } from "@effect-atom/atom-react";

/** Current project snapshot - will be populated from server */
export const snapshotAtom = Atom.make<Patches.Snapshot | null>(null);

export const ReactivityKeys = {
	snapshot: "snapshot",
} as const;
