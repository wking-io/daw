import { Schema } from "effect";
export const InstrumentId = Schema.String.pipe(Schema.brand("InstrumentId"));
export const InstrumentType = Schema.Literal("synth", "sampler", "drum");
export const Instrument = Schema.Struct({
	id: InstrumentId,
	type: InstrumentType,
	name: Schema.String,
	params: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	createdAt: Schema.DateFromNumber,
});
