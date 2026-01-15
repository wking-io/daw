
import { Schema } from "effect";

export const InstrumentId = Schema.String.pipe(Schema.brand("InstrumentId"));
export type InstrumentId = typeof InstrumentId.Type;

export const InstrumentType = Schema.Literal("synth", "sampler", "drum");
export type InstrumentType = typeof InstrumentType.Type;

export const Instrument = Schema.Struct({
	id: InstrumentId,
	type: InstrumentType,
	name: Schema.String,
	params: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	createdAt: Schema.DateFromNumber,
});
export type Instrument = typeof Instrument.Type;
