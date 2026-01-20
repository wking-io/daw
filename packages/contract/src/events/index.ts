import { Schema } from "effect";
import { ProjectVersion } from "../commands";
import * as Domain from "../domain";
import * as Ids from "../ids";
import { TimeSignature } from "../lib/time-signature";

// Project events
export const ProjectCreated = Schema.Struct({
	t: Schema.Literal("project.created"),
	project: Domain.Project,
});
export type ProjectCreated = typeof ProjectCreated.Type;

export const ProjectDeleted = Schema.Struct({
	t: Schema.Literal("project.deleted"),
	projectId: Ids.ProjectId,
});
export type ProjectDeleted = typeof ProjectDeleted.Type;

export const ProjectRenamed = Schema.Struct({
	t: Schema.Literal("project.renamed"),
	name: Schema.String,
});
export type ProjectRenamed = typeof ProjectRenamed.Type;

export const ProjectTempoChanged = Schema.Struct({
	t: Schema.Literal("project.tempoChanged"),
	bpm: Schema.Number,
});
export type ProjectTempoChanged = typeof ProjectTempoChanged.Type;

export const ProjectTimeSignatureChanged = Schema.Struct({
	t: Schema.Literal("project.timeSignatureChanged"),
	timeSignature: TimeSignature,
});
export type ProjectTimeSignatureChanged =
	typeof ProjectTimeSignatureChanged.Type;

export const ProjectTracksReordered = Schema.Struct({
	t: Schema.Literal("project.tracksReordered"),
	trackIds: Schema.Array(Ids.TrackId),
});
export type ProjectTracksReordered = typeof ProjectTracksReordered.Type;

// Track events
export const TrackCreated = Schema.Struct({
	t: Schema.Literal("track.created"),
	track: Domain.Track,
});
export type TrackCreated = typeof TrackCreated.Type;

export const TrackDeleted = Schema.Struct({
	t: Schema.Literal("track.deleted"),
	trackId: Ids.TrackId,
});
export type TrackDeleted = typeof TrackDeleted.Type;

export const TrackRenamed = Schema.Struct({
	t: Schema.Literal("track.renamed"),
	trackId: Ids.TrackId,
	name: Schema.String,
});
export type TrackRenamed = typeof TrackRenamed.Type;

export const TrackColorChanged = Schema.Struct({
	t: Schema.Literal("track.colorChanged"),
	trackId: Ids.TrackId,
	color: Schema.String,
});
export type TrackColorChanged = typeof TrackColorChanged.Type;

export const TrackVolumeChanged = Schema.Struct({
	t: Schema.Literal("track.volumeChanged"),
	trackId: Ids.TrackId,
	volumeDb: Schema.Number,
});
export type TrackVolumeChanged = typeof TrackVolumeChanged.Type;

export const TrackPanChanged = Schema.Struct({
	t: Schema.Literal("track.panChanged"),
	trackId: Ids.TrackId,
	pan: Schema.Number,
});
export type TrackPanChanged = typeof TrackPanChanged.Type;

export const TrackMuteChanged = Schema.Struct({
	t: Schema.Literal("track.muteChanged"),
	trackId: Ids.TrackId,
	mute: Schema.Boolean,
});
export type TrackMuteChanged = typeof TrackMuteChanged.Type;

export const TrackSoloChanged = Schema.Struct({
	t: Schema.Literal("track.soloChanged"),
	trackId: Ids.TrackId,
	solo: Schema.Boolean,
});
export type TrackSoloChanged = typeof TrackSoloChanged.Type;

export const TrackClipsReordered = Schema.Struct({
	t: Schema.Literal("track.clipsReordered"),
	trackId: Ids.TrackId,
	clipIds: Schema.Array(Ids.ClipId),
});
export type TrackClipsReordered = typeof TrackClipsReordered.Type;

// Clip events
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
	startQN: Ids.QN,
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
	length: Ids.QN,
});
export type ClipLoopChanged = typeof ClipLoopChanged.Type;

// MIDI events
export const MidiPatternRenamed = Schema.Struct({
	t: Schema.Literal("midi.patternRenamed"),
	patternId: Ids.PatternId,
	name: Schema.String,
});
export type MidiPatternRenamed = typeof MidiPatternRenamed.Type;

export const MidiNoteAdded = Schema.Struct({
	t: Schema.Literal("midi.noteAdded"),
	patternId: Ids.PatternId,
	note: Domain.MidiNote,
});
export type MidiNoteAdded = typeof MidiNoteAdded.Type;

export const MidiNoteDeleted = Schema.Struct({
	t: Schema.Literal("midi.noteDeleted"),
	patternId: Ids.PatternId,
	noteId: Ids.NoteId,
});
export type MidiNoteDeleted = typeof MidiNoteDeleted.Type;

export const MidiNoteMoved = Schema.Struct({
	t: Schema.Literal("midi.noteMoved"),
	patternId: Ids.PatternId,
	noteId: Ids.NoteId,
	span: Domain.QNSpan,
});
export type MidiNoteMoved = typeof MidiNoteMoved.Type;

export const MidiNoteVelocityChanged = Schema.Struct({
	t: Schema.Literal("midi.noteVelocityChanged"),
	patternId: Ids.PatternId,
	noteId: Ids.NoteId,
	velocity: Schema.Number,
});
export type MidiNoteVelocityChanged = typeof MidiNoteVelocityChanged.Type;

export const MidiNotePitchChanged = Schema.Struct({
	t: Schema.Literal("midi.notePitchChanged"),
	patternId: Ids.PatternId,
	noteId: Ids.NoteId,
	pitch: Schema.Number,
});
export type MidiNotePitchChanged = typeof MidiNotePitchChanged.Type;

// Automation events
export const AutomationLaneCreated = Schema.Struct({
	t: Schema.Literal("automation.laneCreated"),
	lane: Domain.AutomationLane,
});
export type AutomationLaneCreated = typeof AutomationLaneCreated.Type;

export const AutomationLaneDeleted = Schema.Struct({
	t: Schema.Literal("automation.laneDeleted"),
	laneId: Ids.AutomationLaneId,
});
export type AutomationLaneDeleted = typeof AutomationLaneDeleted.Type;

export const AutomationPointAdded = Schema.Struct({
	t: Schema.Literal("automation.pointAdded"),
	laneId: Ids.AutomationLaneId,
	point: Domain.AutomationPoint,
});
export type AutomationPointAdded = typeof AutomationPointAdded.Type;

export const AutomationPointDeleted = Schema.Struct({
	t: Schema.Literal("automation.pointDeleted"),
	laneId: Ids.AutomationLaneId,
	pointId: Ids.AutomationPointId,
});
export type AutomationPointDeleted = typeof AutomationPointDeleted.Type;

export const AutomationPointMoved = Schema.Struct({
	t: Schema.Literal("automation.pointMoved"),
	laneId: Ids.AutomationLaneId,
	pointId: Ids.AutomationPointId,
	timeQN: Schema.optional(Ids.QN),
	value: Schema.optional(Schema.Number),
});
export type AutomationPointMoved = typeof AutomationPointMoved.Type;

export const AutomationPointCurveChanged = Schema.Struct({
	t: Schema.Literal("automation.pointCurveChanged"),
	laneId: Ids.AutomationLaneId,
	pointId: Ids.AutomationPointId,
	curve: Domain.AutomationCurve,
});
export type AutomationPointCurveChanged =
	typeof AutomationPointCurveChanged.Type;

// Audio file events
export const AudioFileRegistered = Schema.Struct({
	t: Schema.Literal("audioFile.registered"),
	audioFile: Domain.AudioFile,
});
export type AudioFileRegistered = typeof AudioFileRegistered.Type;

export const AudioFileUnregistered = Schema.Struct({
	t: Schema.Literal("audioFile.unregistered"),
	audioFileId: Ids.AudioFileId,
});
export type AudioFileUnregistered = typeof AudioFileUnregistered.Type;

export const AudioFileRenamed = Schema.Struct({
	t: Schema.Literal("audioFile.renamed"),
	audioFileId: Ids.AudioFileId,
	name: Schema.String,
});
export type AudioFileRenamed = typeof AudioFileRenamed.Type;

/** Union of all domain events */
export const Event = Schema.Union(
	// Project
	ProjectCreated,
	ProjectDeleted,
	ProjectRenamed,
	ProjectTempoChanged,
	ProjectTimeSignatureChanged,
	ProjectTracksReordered,
	// Track
	TrackCreated,
	TrackDeleted,
	TrackRenamed,
	TrackColorChanged,
	TrackVolumeChanged,
	TrackPanChanged,
	TrackMuteChanged,
	TrackSoloChanged,
	TrackClipsReordered,
	// Clip
	ClipCreated,
	ClipDeleted,
	ClipMoved,
	ClipResized,
	ClipLoopChanged,
	// MIDI
	MidiPatternRenamed,
	MidiNoteAdded,
	MidiNoteDeleted,
	MidiNoteMoved,
	MidiNoteVelocityChanged,
	MidiNotePitchChanged,
	// Automation
	AutomationLaneCreated,
	AutomationLaneDeleted,
	AutomationPointAdded,
	AutomationPointDeleted,
	AutomationPointMoved,
	AutomationPointCurveChanged,
	// Audio file
	AudioFileRegistered,
	AudioFileUnregistered,
	AudioFileRenamed,
);
export type Event = typeof Event.Type;

/** @deprecated Use Event instead */
export const Patch = Event;
/** @deprecated Use Event instead */
export type Patch = Event;

/** Batch of events at a specific version */
export const EventBatch = Schema.Struct({
	version: ProjectVersion,
	events: Schema.Array(Event),
});
export type EventBatch = typeof EventBatch.Type;

/** @deprecated Use EventBatch instead */
export const PatchBatch = Schema.Struct({
	version: ProjectVersion,
	patches: Schema.Array(Event),
});
/** @deprecated Use EventBatch instead */
export type PatchBatch = typeof PatchBatch.Type;

/** Result returned after executing a command */
export const CommandResult = Schema.Struct({
	version: ProjectVersion,
	events: EventBatch,
});
export type CommandResult = typeof CommandResult.Type;

/** @deprecated Use CommandResult instead */
export const SubmitResult = Schema.Struct({
	version: ProjectVersion,
	patches: PatchBatch,
});
/** @deprecated Use CommandResult instead */
export type SubmitResult = typeof SubmitResult.Type;

/** Snapshot of project state */
export const Snapshot = Schema.Struct({
	version: ProjectVersion,
	project: Domain.Project,
	tracks: Schema.Array(Domain.Track),
	clips: Schema.Array(Domain.Clip),
	midiPatterns: Schema.Array(Domain.MidiPattern),
	automationLanes: Schema.Array(Domain.AutomationLane),
	audioFiles: Schema.Array(Domain.AudioFile),
});
export type Snapshot = typeof Snapshot.Type;
