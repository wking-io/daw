import type {
	CreateInstrumentCommand,
	CreateInstrumentResult,
	Instrument,
	InstrumentId,
} from "@daw/contract";
import { CreateInstrumentResult as CreateInstrumentResultSchema } from "@daw/contract";
import * as Registry from "@effect-atom/atom/Registry";
import { Effect, Schema } from "effect";
import { ulid } from "ulid";
import { instrumentsAtom } from "./state";

export const executeCreateInstrument = (
	cmd: CreateInstrumentCommand,
): Effect.Effect<Instrument, never, Registry.AtomRegistry> =>
	Effect.gen(function* () {
		const registry = yield* Registry.AtomRegistry;
		const instrument: Instrument = {
			id: ulid() as InstrumentId,
			type: cmd.type,
			name: cmd.name,
			params: {},
			createdAt: new Date(),
		};
		registry.update(instrumentsAtom, (prev: ReadonlyArray<Instrument>) => [
			...prev,
			instrument,
		]);
		return instrument;
	});

export const encodeCreateInstrumentResultJson = (
	result: CreateInstrumentResult,
): string =>
	JSON.stringify(Schema.encodeSync(CreateInstrumentResultSchema)(result));
