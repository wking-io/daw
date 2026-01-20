import type { Instrument } from "@daw/contract";
import { Atom } from "@effect-atom/atom-react";

export const instrumentsAtom = Atom.make<ReadonlyArray<Instrument.Instrument>>(
	[],
);

export const ReactivityKeys = {
	instruments: "instruments",
} as const;
