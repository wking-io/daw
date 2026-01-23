import { Schema } from "effect";
import { Clip, QNSpan } from "../domain/clip";
import { MidiPattern } from "../domain/midi";
import * as Ids from "../ids";
import { QN } from "../ids";

export const ClipCreated = Schema.Struct({
	t: Schema.Literal("clip.created"),
	clip: Clip,
	pattern: Schema.optional(MidiPattern), // included for midi clips
});
export type ClipCreated = Schema.Schema.Type<typeof ClipCreated>;

export const ClipDeleted = Schema.Struct({
	t: Schema.Literal("clip.deleted"),
	clipId: Ids.ClipId,
});
export type ClipDeleted = Schema.Schema.Type<typeof ClipDeleted>;

export const ClipMoved = Schema.Struct({
	t: Schema.Literal("clip.moved"),
	clipId: Ids.ClipId,
	start: QN,
	trackId: Schema.optional(Ids.TrackId),
});
export type ClipMoved = Schema.Schema.Type<typeof ClipMoved>;

export const ClipResized = Schema.Struct({
	t: Schema.Literal("clip.resized"),
	clipId: Ids.ClipId,
	span: QNSpan,
});
export type ClipResized = Schema.Schema.Type<typeof ClipResized>;

export const ClipLoopChanged = Schema.Struct({
	t: Schema.Literal("clip.loopChanged"),
	clipId: Ids.ClipId,
	enabled: Schema.Boolean,
	length: QN,
});
export type ClipLoopChanged = Schema.Schema.Type<typeof ClipLoopChanged>;

export const ClipEvent = Schema.Union(
	ClipCreated,
	ClipDeleted,
	ClipMoved,
	ClipResized,
	ClipLoopChanged,
);
export type ClipEvent = Schema.Schema.Type<typeof ClipEvent>;
