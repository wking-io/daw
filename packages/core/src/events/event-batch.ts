import { Schema } from "effect";
import { Id, type ValidId } from "../ids";
import type { SchemaOf } from "../utils/schema-of";
import { type ValidVersion, Version } from "../versions";
import { AudioFileEvent } from "./audio";
import { AutomationEvent } from "./automation";
import { ClipEvent } from "./clip";
import { MidiEvent } from "./midi";
import { ProjectEvent } from "./project";
import { TrackEvent } from "./track";

export const Event = Schema.Union(
  ProjectEvent,
  ClipEvent,
  AutomationEvent,
  AudioFileEvent,
  MidiEvent,
  TrackEvent,
);
export type Event = Schema.Schema.Type<typeof Event>;

/** Batch of events at a specific version */
export const EventBatch = <
  I extends ValidId,
  V extends ValidVersion,
  E extends SchemaOf<typeof Event>,
>(
  id: I,
  version: V,
  event: E,
) => {
  const base = Schema.Struct({
    t: Schema.Literal("events"),
    id: Id(id),
    version: Version(version),
    events: Schema.Array(event),
  });

  return Schema.Struct({
    ...base.fields,
    projectId: Id(id),
  });
};
