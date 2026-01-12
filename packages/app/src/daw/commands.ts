import type {
	CreateInstrumentCommand,
	Instrument,
	InstrumentId,
} from "@daw/contract";
import { Effect } from "effect";
import { ulid } from "ulid";
import type { DawStore } from "./store";

export const executeCreateInstrument = (
	store: DawStore,
	cmd: CreateInstrumentCommand,
): Effect.Effect<Instrument> =>
	Effect.sync(() => {
		const instrument: Instrument = {
			id: ulid() as InstrumentId,
			type: cmd.type,
			name: cmd.name,
			params: {},
			createdAt: new Date(),
		};
		store.addInstrument(instrument);
		return instrument;
	});
