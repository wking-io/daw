import { Schema } from "effect";
export declare const InstrumentId: Schema.brand<
	typeof Schema.String,
	"InstrumentId"
>;
export type InstrumentId = typeof InstrumentId.Type;
export declare const InstrumentType: Schema.Literal<
	["synth", "sampler", "drum"]
>;
export type InstrumentType = typeof InstrumentType.Type;
export declare const Instrument: Schema.Struct<{
	id: Schema.brand<typeof Schema.String, "InstrumentId">;
	type: Schema.Literal<["synth", "sampler", "drum"]>;
	name: typeof Schema.String;
	params: Schema.Record$<typeof Schema.String, typeof Schema.Unknown>;
	createdAt: typeof Schema.DateFromNumber;
}>;
export type Instrument = typeof Instrument.Type;
