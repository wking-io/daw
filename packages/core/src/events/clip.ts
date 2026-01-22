import { Schema } from "effect";
import * as Domain from "../domain";
import * as Ids from "../ids";

export const ClipCreated = Schema.Struct({
	t: Schema.Literal("clip.created"),
	clip: Domain.Clip,
	pattern: Schema.optional(Domain.MidiPattern), // included for midi clips
});
export type ClipCreated = typeof ClipCreated.Type;

export const ClipDeleted = Schema.Struct({
	t: Schema.Literal("clip.deleted"),
	clipId: Ids.ClipId,
});
export type ClipDeleted = typeof ClipDeleted.Type;

export const ClipMoved = Schema.Struct({
	t: Schema.Literal("clip.moved"),
	clipId: Ids.ClipId,
	start: Domain.QN,
	trackId: Schema.optional(Ids.TrackId),
});
export type ClipMoved = typeof ClipMoved.Type;

export const ClipResized = Schema.Struct({
	t: Schema.Literal("clip.resized"),
	clipId: Ids.ClipId,
	span: Domain.QNSpan,
});
export type ClipResized = typeof ClipResized.Type;

export const ClipLoopChanged = Schema.Struct({
	t: Schema.Literal("clip.loopChanged"),
	clipId: Ids.ClipId,
	enabled: Schema.Boolean,
	length: Domain.QN,
});
export type ClipLoopChanged = typeof ClipLoopChanged.Type;

export const ClipEvent = Schema.Union(
	ClipCreated,
	ClipDeleted,
	ClipMoved,
	ClipResized,
	ClipLoopChanged,
);
export type ClipEvent = typeof ClipEvent.Type;
