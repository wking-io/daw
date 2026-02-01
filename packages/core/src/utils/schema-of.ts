import type { Schema } from "effect";

export type SchemaOf<
  P extends Schema.Schema.Any,
  S extends Schema.Schema.Any = Schema.Schema.Any,
> = S extends Schema.Schema.Any ? (Schema.Schema.Type<S> extends P ? S : never) : never;
