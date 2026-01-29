import { DateTime, Option, Schema } from "effect";
import type { EditorCommandPayload } from "../commands/editor-ops";
import type { ProjectCreate } from "../commands/project-ops";
import type { EditorEvent } from "../events/editor";
import type { ProjectCreated } from "../events/project";
import { ProjectId } from "../ids";
import { TimeSignature } from "../lib/time-signature";
import { ProjectVersion } from "../versions";
import { AudioFile, type AudioFile as AudioFileType } from "./audio-file";
import {
	AutomationLane,
	type AutomationLane as AutomationLaneType,
	type AutomationPoint as AutomationPointType,
} from "./automation";
import { Clip, type Clip as ClipType } from "./clip";
import {
	type MidiNote as MidiNoteType,
	MidiPattern,
	type MidiPattern as MidiPatternType,
} from "./midi";
import { WithTimestamps } from "./timestamps";
import { Track, type Track as TrackType } from "./track";

export type { AudioFile } from "./audio-file";
export type { AutomationLane, AutomationPoint } from "./automation";
export type { Clip } from "./clip";
export type { MidiNote, MidiPattern } from "./midi";
export type { Track } from "./track";

export const Project = Schema.Struct({
	id: ProjectId,
	name: Schema.String,
	version: ProjectVersion,
	bpm: Schema.Number.pipe(Schema.between(20, 999)),
	timeSignature: TimeSignature,
	tracks: Schema.Array(Track),
	clips: Schema.Array(Clip),
	midiPatterns: Schema.Array(MidiPattern),
	automationLanes: Schema.Array(AutomationLane),
	audioFiles: Schema.Array(AudioFile),
	deletedAt: Schema.OptionFromNullOr(Schema.DateTimeUtc),
});
export type Project = Schema.Schema.Type<typeof Project>;

export const ProjectWithTimestamps = WithTimestamps(Project);
export type ProjectWithTimestamps = Schema.Schema.Type<
	typeof ProjectWithTimestamps
>;

export const ProjectSummary = WithTimestamps(
	Schema.Struct({
		id: ProjectId,
		name: Schema.String,
		version: ProjectVersion,
	}),
);
export type ProjectSummary = Schema.Schema.Type<typeof ProjectSummary>;

function updateById<T extends { id: string }>(
	arr: readonly T[],
	id: string,
	updater: (item: T) => T,
): T[] {
	return arr.map((item) => (item.id === id ? updater(item) : item));
}

function removeById<T extends { id: string }>(
	arr: readonly T[],
	id: string,
): T[] {
	return arr.filter((item) => item.id !== id);
}

function updateNestedById<
	Parent extends { id: string },
	Child extends { id: string },
>(
	arr: readonly Parent[],
	parentId: string,
	childArrayKey: keyof Parent,
	childId: string,
	updater: (child: Child) => Child,
): Parent[] {
	return arr.map((parent) => {
		if (parent.id !== parentId) return parent;
		const children = parent[childArrayKey] as unknown as Child[];
		return {
			...parent,
			[childArrayKey]: children.map((child) =>
				child.id === childId ? updater(child) : child,
			),
		};
	});
}

function removeNestedById<Parent extends { id: string }>(
	arr: readonly Parent[],
	parentId: string,
	childArrayKey: keyof Parent,
	childId: string,
): Parent[] {
	return arr.map((parent) => {
		if (parent.id !== parentId) return parent;
		const children = parent[childArrayKey] as unknown as { id: string }[];
		return {
			...parent,
			[childArrayKey]: children.filter((child) => child.id !== childId),
		};
	});
}

function addNestedItem<Parent extends { id: string }, Child>(
	arr: readonly Parent[],
	parentId: string,
	childArrayKey: keyof Parent,
	child: Child,
): Parent[] {
	return arr.map((parent) => {
		if (parent.id !== parentId) return parent;
		const children = parent[childArrayKey] as unknown as Child[];
		return {
			...parent,
			[childArrayKey]: [...children, child],
		};
	});
}

export function evolve(project: Project, event: EditorEvent): Project {
	switch (event.t) {
		case "project.created":
			return event.project;

		case "project.deleted":
			return { ...project, deletedAt: Option.some(event.deletedAt) };

		case "project.renamed":
			return { ...project, name: event.name };

		case "project.tempoChanged":
			return { ...project, bpm: event.bpm };

		case "project.timeSignatureChanged":
			return { ...project, timeSignature: event.timeSignature };

		case "project.tracksReordered": {
			const trackMap = new Map<string, TrackType>(
				project.tracks.map((t) => [t.id, t] as const),
			);
			const reordered = event.trackIds
				.map((id: string) => trackMap.get(id))
				.filter((t: TrackType | undefined): t is TrackType => t !== undefined);
			return { ...project, tracks: reordered };
		}

		case "track.created":
			return { ...project, tracks: [...project.tracks, event.track] };

		case "track.deleted":
			return { ...project, tracks: removeById(project.tracks, event.trackId) };

		case "track.renamed":
			return {
				...project,
				tracks: updateById(project.tracks, event.trackId, (t) => ({
					...t,
					name: event.name,
				})),
			};

		case "track.colorChanged":
			return {
				...project,
				tracks: updateById(project.tracks, event.trackId, (t) => ({
					...t,
					color: event.color,
				})),
			};

		case "track.volumeChanged":
			return {
				...project,
				tracks: updateById(project.tracks, event.trackId, (t) => ({
					...t,
					volumeDb: event.volumeDb,
				})),
			};

		case "track.panChanged":
			return {
				...project,
				tracks: updateById(project.tracks, event.trackId, (t) => ({
					...t,
					pan: event.pan,
				})),
			};

		case "track.muteChanged":
			return {
				...project,
				tracks: updateById(project.tracks, event.trackId, (t) => ({
					...t,
					mute: event.mute,
				})),
			};

		case "track.soloChanged":
			return {
				...project,
				tracks: updateById(project.tracks, event.trackId, (t) => ({
					...t,
					solo: event.solo,
				})),
			};

		case "track.clipsReordered": {
			const clipIdSet = new Set(event.clipIds);
			const orderMap = new Map<string, number>(
				event.clipIds.map((id: string, idx: number) => [id, idx] as const),
			);
			return {
				...project,
				clips: project.clips.map(
					(clip): ClipType =>
						clipIdSet.has(clip.id)
							? { ...clip, sortOrder: orderMap.get(clip.id) ?? clip.sortOrder }
							: clip,
				),
			};
		}

		case "clip.created": {
			let updated: Project = {
				...project,
				clips: [...project.clips, event.clip],
			};
			if (event.pattern) {
				updated = {
					...updated,
					midiPatterns: [...updated.midiPatterns, event.pattern],
				};
			}
			return updated;
		}

		case "clip.deleted":
			return { ...project, clips: removeById(project.clips, event.clipId) };

		case "clip.moved":
			return {
				...project,
				clips: updateById(project.clips, event.clipId, (c) => ({
					...c,
					span: { ...c.span, start: event.start },
					...(event.trackId !== undefined && { trackId: event.trackId }),
				})),
			};

		case "clip.resized":
			return {
				...project,
				clips: updateById(project.clips, event.clipId, (c) => ({
					...c,
					span: event.span,
				})),
			};

		case "clip.loopChanged":
			return {
				...project,
				clips: updateById(project.clips, event.clipId, (c) => ({
					...c,
					loop: { enabled: event.enabled, length: event.length },
				})),
			};

		case "midi.patternRenamed":
			return {
				...project,
				midiPatterns: updateById(
					project.midiPatterns,
					event.patternId,
					(p) => ({
						...p,
						name: event.name,
					}),
				),
			};

		case "midi.noteAdded":
			return {
				...project,
				midiPatterns: addNestedItem<MidiPatternType, MidiNoteType>(
					project.midiPatterns,
					event.patternId,
					"notes",
					event.note,
				),
			};

		case "midi.noteDeleted":
			return {
				...project,
				midiPatterns: removeNestedById(
					project.midiPatterns,
					event.patternId,
					"notes",
					event.noteId,
				),
			};

		case "midi.noteMoved":
			return {
				...project,
				midiPatterns: updateNestedById<MidiPatternType, MidiNoteType>(
					project.midiPatterns,
					event.patternId,
					"notes",
					event.noteId,
					(n) => ({ ...n, span: event.span }),
				),
			};

		case "midi.noteVelocityChanged":
			return {
				...project,
				midiPatterns: updateNestedById<MidiPatternType, MidiNoteType>(
					project.midiPatterns,
					event.patternId,
					"notes",
					event.noteId,
					(n) => ({ ...n, velocity: event.velocity }),
				),
			};

		case "midi.notePitchChanged":
			return {
				...project,
				midiPatterns: updateNestedById<MidiPatternType, MidiNoteType>(
					project.midiPatterns,
					event.patternId,
					"notes",
					event.noteId,
					(n) => ({ ...n, pitch: event.pitch }),
				),
			};

		case "automation.laneCreated":
			return {
				...project,
				automationLanes: [...project.automationLanes, event.lane],
			};

		case "automation.laneDeleted":
			return {
				...project,
				automationLanes: removeById(project.automationLanes, event.laneId),
			};

		case "automation.pointAdded":
			return {
				...project,
				automationLanes: addNestedItem<AutomationLaneType, AutomationPointType>(
					project.automationLanes,
					event.laneId,
					"points",
					event.point,
				),
			};

		case "automation.pointDeleted":
			return {
				...project,
				automationLanes: removeNestedById(
					project.automationLanes,
					event.laneId,
					"points",
					event.pointId,
				),
			};

		case "automation.pointMoved":
			return {
				...project,
				automationLanes: updateNestedById<
					AutomationLaneType,
					AutomationPointType
				>(
					project.automationLanes,
					event.laneId,
					"points",
					event.pointId,
					(p) => ({
						...p,
						...(event.time !== undefined && { timeQN: event.time }),
						...(event.value !== undefined && { value: event.value }),
					}),
				),
			};

		case "automation.pointCurveChanged":
			return {
				...project,
				automationLanes: updateNestedById<
					AutomationLaneType,
					AutomationPointType
				>(
					project.automationLanes,
					event.laneId,
					"points",
					event.pointId,
					(p) => ({ ...p, curve: event.curve }),
				),
			};

		case "audioFile.registered":
			return {
				...project,
				audioFiles: [...project.audioFiles, event.audioFile],
			};

		case "audioFile.unregistered":
			return {
				...project,
				audioFiles: removeById(project.audioFiles, event.audioFileId),
			};

		case "audioFile.renamed":
			return {
				...project,
				audioFiles: updateById(project.audioFiles, event.audioFileId, (a) => ({
					...a,
					name: event.name,
				})),
			};

		default:
			return project;
	}
}

export function create(command: ProjectCreate): ProjectCreated {
	return {
		t: "project.created",
		project: {
			id: command.projectId,
			name: command.name,
			version: ProjectVersion.make(0),
			bpm: command.bpm ?? 120,
			timeSignature:
				command.timeSignature ??
				TimeSignature.make({ numerator: 4, denominator: 4 }),
			tracks: [],
			clips: [],
			midiPatterns: [],
			automationLanes: [],
			audioFiles: [],
			deletedAt: Option.none(),
		},
	};
}

export function decide(
	project: Project,
	command: EditorCommandPayload,
): readonly EditorEvent[] {
	switch (command.t) {
		case "project.delete":
			return [
				{
					t: "project.deleted",
					projectId: project.id,
					deletedAt: DateTime.unsafeNow(),
				},
			];

		case "project.rename":
			if (command.name === project.name) return [];
			return [{ t: "project.renamed", name: command.name }];

		case "project.setTempo":
			if (command.bpm === project.bpm) return [];
			return [{ t: "project.tempoChanged", bpm: command.bpm }];

		case "project.setTimeSignature":
			if (
				command.timeSignature.numerator === project.timeSignature.numerator &&
				command.timeSignature.denominator === project.timeSignature.denominator
			)
				return [];
			return [
				{
					t: "project.timeSignatureChanged",
					timeSignature: command.timeSignature,
				},
			];

		case "project.reorderTracks":
			return [{ t: "project.tracksReordered", trackIds: command.trackIds }];

		case "track.create": {
			const track: TrackType = {
				id: command.trackId,
				projectId: project.id,
				type: command.type,
				name: command.name,
				color: command.color ?? "#808080",
				volumeDb: 0,
				pan: 0,
				mute: false,
				solo: false,
				sortOrder: command.index ?? project.tracks.length,
				deviceIds: [],
			};
			return [{ t: "track.created", track }];
		}

		case "track.delete":
			return [{ t: "track.deleted", trackId: command.trackId }];

		case "track.rename":
			return [
				{
					t: "track.renamed",
					trackId: command.trackId,
					name: command.name,
				},
			];

		case "track.setColor":
			return [
				{
					t: "track.colorChanged",
					trackId: command.trackId,
					color: command.color,
				},
			];

		case "track.setVolume":
			return [
				{
					t: "track.volumeChanged",
					trackId: command.trackId,
					volumeDb: command.volumeDb,
				},
			];

		case "track.setPan":
			return [
				{
					t: "track.panChanged",
					trackId: command.trackId,
					pan: command.pan,
				},
			];

		case "track.setMute":
			return [
				{
					t: "track.muteChanged",
					trackId: command.trackId,
					mute: command.mute,
				},
			];

		case "track.setSolo":
			return [
				{
					t: "track.soloChanged",
					trackId: command.trackId,
					solo: command.solo,
				},
			];

		case "track.reorderClips":
			return [
				{
					t: "track.clipsReordered",
					trackId: command.trackId,
					clipIds: command.clipIds,
				},
			];

		case "clip.createMidi": {
			const pattern: MidiPatternType = {
				id: command.newPatternId,
				projectId: project.id,
				name: "New Pattern",
				notes: [],
			};
			const clip: ClipType = {
				id: command.clipId,
				projectId: project.id,
				trackId: command.trackId,
				span: command.span,
				loop: { enabled: false, length: command.span.size },
				sortOrder: project.clips.filter((c) => c.trackId === command.trackId)
					.length,
				payload: { kind: "midi", patternId: command.newPatternId },
			};
			return [{ t: "clip.created", clip, pattern }];
		}

		case "clip.createAudio": {
			const clip: ClipType = {
				id: command.clipId,
				projectId: project.id,
				trackId: command.trackId,
				span: command.span,
				loop: { enabled: false, length: command.span.size },
				sortOrder: project.clips.filter((c) => c.trackId === command.trackId)
					.length,
				payload: {
					kind: "audio",
					audioFileId: command.audioFileId,
					offsetSec: command.offsetSec ?? 0,
				},
			};
			return [{ t: "clip.created", clip }];
		}

		case "clip.delete":
			return [{ t: "clip.deleted", clipId: command.clipId }];

		case "clip.move":
			return [
				{
					t: "clip.moved",
					clipId: command.clipId,
					start: command.startQN,
					...(command.trackId !== undefined && {
						trackId: command.trackId,
					}),
				},
			];

		case "clip.resize":
			return [
				{ t: "clip.resized", clipId: command.clipId, span: command.span },
			];

		case "clip.setLoop": {
			const clip = project.clips.find((c) => c.id === command.clipId);
			const length = command.length ?? clip?.loop.length ?? clip?.span.size;
			if (!length) return [];
			return [
				{
					t: "clip.loopChanged",
					clipId: command.clipId,
					enabled: command.enabled,
					length,
				},
			];
		}

		case "midi.renamePattern":
			return [
				{
					t: "midi.patternRenamed",
					patternId: command.patternId,
					name: command.name,
				},
			];

		case "midi.addNote": {
			const note: MidiNoteType = {
				id: command.noteId,
				pitch: command.pitch,
				velocity: command.velocity,
				span: command.span,
			};
			return [{ t: "midi.noteAdded", patternId: command.patternId, note }];
		}

		case "midi.deleteNote":
			return [
				{
					t: "midi.noteDeleted",
					patternId: command.patternId,
					noteId: command.noteId,
				},
			];

		case "midi.moveNote":
			return [
				{
					t: "midi.noteMoved",
					patternId: command.patternId,
					noteId: command.noteId,
					span: command.span,
				},
			];

		case "midi.setNoteVelocity":
			return [
				{
					t: "midi.noteVelocityChanged",
					patternId: command.patternId,
					noteId: command.noteId,
					velocity: command.velocity,
				},
			];

		case "midi.setNotePitch":
			return [
				{
					t: "midi.notePitchChanged",
					patternId: command.patternId,
					noteId: command.noteId,
					pitch: command.pitch,
				},
			];

		case "automation.createLane": {
			const lane: AutomationLaneType = {
				id: command.laneId,
				projectId: project.id,
				trackId: command.trackId,
				paramPath: command.paramPath,
				points: [],
			};
			return [{ t: "automation.laneCreated", lane }];
		}

		case "automation.deleteLane":
			return [{ t: "automation.laneDeleted", laneId: command.laneId }];

		case "automation.addPoint": {
			const point: AutomationPointType = {
				id: command.pointId,
				timeQN: command.timeQN,
				value: command.value,
				curve: command.curve ?? "linear",
			};
			return [{ t: "automation.pointAdded", laneId: command.laneId, point }];
		}

		case "automation.deletePoint":
			return [
				{
					t: "automation.pointDeleted",
					laneId: command.laneId,
					pointId: command.pointId,
				},
			];

		case "automation.movePoint":
			return [
				{
					t: "automation.pointMoved",
					laneId: command.laneId,
					pointId: command.pointId,
					...(command.timeQN !== undefined && { time: command.timeQN }),
					...(command.value !== undefined && { value: command.value }),
				},
			];

		case "automation.setPointCurve":
			return [
				{
					t: "automation.pointCurveChanged",
					laneId: command.laneId,
					pointId: command.pointId,
					curve: command.curve,
				},
			];

		case "audioFile.register": {
			const audioFile: AudioFileType = {
				id: command.audioFileId,
				projectId: project.id,
				name: command.name ?? command.sourcePath.split("/").pop() ?? "audio",
				originalPath: command.sourcePath,
				storedPath: command.sourcePath,
				durationSec: 0,
				sampleRate: 44100,
				channels: 2,
			};
			return [{ t: "audioFile.registered", audioFile }];
		}

		case "audioFile.unregister":
			return [
				{ t: "audioFile.unregistered", audioFileId: command.audioFileId },
			];

		case "audioFile.rename":
			return [
				{
					t: "audioFile.renamed",
					audioFileId: command.audioFileId,
					name: command.name,
				},
			];

		default: {
			const _exhaustive: never = command;
			return [];
		}
	}
}
