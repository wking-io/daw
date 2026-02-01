import { Effect, Schema } from "effect";
import { ParseError } from "effect/ParseResult";

export function parseFormData<A>(
  schema: Schema.Schema<A>,
  formData: FormData,
): Effect.Effect<A, ParseError> {
  const raw = Object.fromEntries(formData.entries());
  return Schema.decodeUnknown(schema)(raw);
}
