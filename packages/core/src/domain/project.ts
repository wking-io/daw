import { Schema } from "effect";
import { ProjectId } from "../ids";
import { TimeSignature } from "../lib/time-signature";
import { ProjectVersion } from "../versions";
import { AudioFile } from "./audio-file";
import { AutomationLane } from "./automation";
import { Clip } from "./clip";
import { MidiPattern } from "./midi";
import { Track } from "./track";

export const Project = Schema.Struct({
	id: ProjectId,
	name: Schema.String,
	version: ProjectVersion,
	createdAt: Schema.DateFromNumber,
	updatedAt: Schema.DateFromNumber,
	bpm: Schema.Number.pipe(Schema.between(20, 999)),
	timeSignature: TimeSignature,
	tracks: Schema.Array(Track),
	clips: Schema.Array(Clip),
	midiPatterns: Schema.Array(MidiPattern),
	automationLanes: Schema.Array(AutomationLane),
	audioFiles: Schema.Array(AudioFile),
});
export type Project = typeof Project.Type;
