import type { Instrument } from "@daw/contract";
import * as Atom from "@effect-atom/atom/Atom";

export const instrumentsAtom = Atom.make<ReadonlyArray<Instrument>>([]);

export const logsAtom = Atom.make<ReadonlyArray<string>>([]);
