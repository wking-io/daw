import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { Ids } from "../..";
import type { EditorCommandPayload } from "../../commands/editor-ops";
import type { EditorEvent } from "../../events";
import {
	AudioFileId,
	AutomationLaneId,
	AutomationPointId,
	ClipId,
	NoteId,
	PatternId,
	ProjectId,
	TrackId,
} from "../../ids";
import { ProjectVersion } from "../../versions";
import {
	type AudioFile,
	type AutomationLane,
	type AutomationPoint,
	type Clip,
	decide,
	evolve,
	type MidiNote,
	type MidiPattern,
	Project,
	type Track,
} from "../project";
import { QN } from "../qn";

const createBaseProject = (): Project => ({
	id: ProjectId.make("proj-1"),
	name: "Test Project",
	version: ProjectVersion.make(1),
	createdAt: new Date(1704067200000),
	updatedAt: new Date(1704067200000),
	bpm: 120,
	timeSignature: { numerator: 4, denominator: 4 as const },
	tracks: [],
	clips: [],
	midiPatterns: [],
	automationLanes: [],
	audioFiles: [],
});

const createTrack = (id: string, overrides?: Partial<Track>): Track => ({
	id: TrackId.make(id),
	projectId: ProjectId.make("proj-1"),
	type: "midi",
	name: "Track",
	color: "#ff0000",
	volumeDb: 0,
	pan: 0,
	mute: false,
	solo: false,
	sortOrder: 0,
	deviceIds: [],
	...overrides,
});

const createClip = (id: string, trackId: string): Clip => ({
	id: ClipId.make(id),
	projectId: ProjectId.make("proj-1"),
	trackId: TrackId.make(trackId),
	span: { start: QN.make(0), size: QN.make(4) },
	loop: { enabled: false, length: QN.make(4) },
	sortOrder: 0,
	payload: { kind: "midi", patternId: PatternId.make("pattern-1") },
});

const createMidiPattern = (
	id: string,
	notes: readonly MidiNote[] = [],
): MidiPattern => ({
	id: PatternId.make(id),
	projectId: ProjectId.make("proj-1"),
	name: "Pattern",
	notes,
});

const createMidiNote = (id: string): MidiNote => ({
	id: NoteId.make(id),
	pitch: 60,
	velocity: 100,
	span: { start: QN.make(0), size: QN.make(1) },
});

const createAutomationLane = (
	id: string,
	trackId: string,
	points: readonly AutomationPoint[] = [],
): AutomationLane => ({
	id: AutomationLaneId.make(id),
	projectId: ProjectId.make("proj-1"),
	trackId: TrackId.make(trackId),
	paramPath: "volume",
	points,
});

const createAutomationPoint = (id: string): AutomationPoint => ({
	id: AutomationPointId.make(id),
	timeQN: QN.make(0),
	value: 0.5,
	curve: "linear",
});

const createAudioFile = (id: string): AudioFile => ({
	id: AudioFileId.make(id),
	projectId: ProjectId.make("proj-1"),
	name: "audio.wav",
	originalPath: "/path/to/audio.wav",
	storedPath: "/stored/audio.wav",
	durationSec: 10,
	sampleRate: 44100,
	channels: 2,
});

describe("Project schema", () => {
	const validProjectJson: Schema.Schema.Encoded<typeof Project> = {
		id: ProjectId.make("proj-123"),
		version: ProjectVersion.make(1),
		name: "My Project",
		createdAt: 1704067200000, // 2024-01-01
		updatedAt: 1704153600000, // 2024-01-02
		bpm: 120,
		timeSignature: { numerator: 4, denominator: 4 as const },
		tracks: [],
		clips: [],
		midiPatterns: [],
		automationLanes: [],
		audioFiles: [],
	};

	it("decodes valid project", () => {
		const decoded = Schema.decodeUnknownSync(Project)(validProjectJson);
		expect(decoded.id).toBe(ProjectId.make("proj-123"));
		expect(decoded.version).toBe(ProjectVersion.make(1));
		expect(decoded.name).toBe("My Project");
		expect(decoded.bpm).toBe(120);
		expect(decoded.createdAt).toBeInstanceOf(Date);
		expect(decoded.updatedAt).toBeInstanceOf(Date);
	});

	it("encodes project back to JSON format", () => {
		const decoded = Schema.decodeUnknownSync(Project)(validProjectJson);
		const encoded = Schema.encodeSync(Project)(decoded);
		expect(encoded.createdAt).toBe(1704067200000);
		expect(encoded.updatedAt).toBe(1704153600000);
	});

	it("rejects bpm below 20", () => {
		expect(() =>
			Schema.decodeUnknownSync(Project)({ ...validProjectJson, bpm: 19 }),
		).toThrow("between(20, 999)");
	});

	it("rejects bpm above 999", () => {
		expect(() =>
			Schema.decodeUnknownSync(Project)({
				...validProjectJson,
				bpm: 1000,
			}),
		).toThrow("between(20, 999)");
	});
});

describe("Project.evolve", () => {
	describe("project events", () => {
		it("handles project.created by replacing state with the new project", () => {
			const project = createBaseProject();
			const newProject = {
				...createBaseProject(),
				name: "New Project",
				bpm: 140,
			};
			const event: EditorEvent = { t: "project.created", project: newProject };

			const result = evolve(project, event);

			expect(result.name).toBe("New Project");
			expect(result.bpm).toBe(140);
		});

		it("handles project.deleted by returning project unchanged", () => {
			const project = createBaseProject();
			const event: EditorEvent = {
				t: "project.deleted",
				projectId: ProjectId.make("proj-1"),
			};

			const result = evolve(project, event);

			expect(result).toEqual(project);
		});

		it("handles project.renamed", () => {
			const project = createBaseProject();
			const event: EditorEvent = {
				t: "project.renamed",
				name: "Renamed Project",
			};

			const result = evolve(project, event);

			expect(result.name).toBe("Renamed Project");
		});

		it("handles project.tempoChanged", () => {
			const project = createBaseProject();
			const event: EditorEvent = { t: "project.tempoChanged", bpm: 140 };

			const result = evolve(project, event);

			expect(result.bpm).toBe(140);
		});

		it("handles project.timeSignatureChanged", () => {
			const project = createBaseProject();
			const event: EditorEvent = {
				t: "project.timeSignatureChanged",
				timeSignature: { numerator: 3, denominator: 4 as const },
			};

			const result = evolve(project, event);

			expect(result.timeSignature).toEqual({ numerator: 3, denominator: 4 });
		});

		it("handles project.tracksReordered", () => {
			const project = {
				...createBaseProject(),
				tracks: [
					createTrack("track-1", { name: "Track 1", sortOrder: 0 }),
					createTrack("track-2", { name: "Track 2", sortOrder: 1 }),
					createTrack("track-3", { name: "Track 3", sortOrder: 2 }),
				],
			};
			const event: EditorEvent = {
				t: "project.tracksReordered",
				trackIds: [
					TrackId.make("track-3"),
					TrackId.make("track-1"),
					TrackId.make("track-2"),
				],
			};

			const result = evolve(project, event);

			expect(result.tracks.map((t) => t.id)).toEqual([
				TrackId.make("track-3"),
				TrackId.make("track-1"),
				TrackId.make("track-2"),
			]);
		});
	});

	describe("track events", () => {
		it("handles track.created", () => {
			const project = createBaseProject();
			const track = createTrack("track-1");
			const event: EditorEvent = { t: "track.created", track };

			const result = evolve(project, event);

			expect(result.tracks).toHaveLength(1);
			expect(result.tracks[0].id).toBe(TrackId.make("track-1"));
		});

		it("handles track.deleted", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const event: EditorEvent = {
				t: "track.deleted",
				trackId: TrackId.make("track-1"),
			};

			const result = evolve(project, event);

			expect(result.tracks).toHaveLength(0);
		});

		it("handles track.renamed", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { name: "Old Name" })],
			};
			const event: EditorEvent = {
				t: "track.renamed",
				trackId: TrackId.make("track-1"),
				name: "New Name",
			};

			const result = evolve(project, event);

			expect(result.tracks[0].name).toBe("New Name");
		});

		it("handles track.colorChanged", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { color: "#ff0000" })],
			};
			const event: EditorEvent = {
				t: "track.colorChanged",
				trackId: TrackId.make("track-1"),
				color: "#00ff00",
			};

			const result = evolve(project, event);

			expect(result.tracks[0].color).toBe("#00ff00");
		});

		it("handles track.volumeChanged", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { volumeDb: 0 })],
			};
			const event: EditorEvent = {
				t: "track.volumeChanged",
				trackId: TrackId.make("track-1"),
				volumeDb: -6,
			};

			const result = evolve(project, event);

			expect(result.tracks[0].volumeDb).toBe(-6);
		});

		it("handles track.panChanged", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { pan: 0 })],
			};
			const event: EditorEvent = {
				t: "track.panChanged",
				trackId: TrackId.make("track-1"),
				pan: 0.5,
			};

			const result = evolve(project, event);

			expect(result.tracks[0].pan).toBe(0.5);
		});

		it("handles track.muteChanged", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { mute: false })],
			};
			const event: EditorEvent = {
				t: "track.muteChanged",
				trackId: TrackId.make("track-1"),
				mute: true,
			};

			const result = evolve(project, event);

			expect(result.tracks[0].mute).toBe(true);
		});

		it("handles track.soloChanged", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { solo: false })],
			};
			const event: EditorEvent = {
				t: "track.soloChanged",
				trackId: TrackId.make("track-1"),
				solo: true,
			};

			const result = evolve(project, event);

			expect(result.tracks[0].solo).toBe(true);
		});

		it("handles track.clipsReordered", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
				clips: [
					{ ...createClip("clip-1", "track-1"), sortOrder: 0 },
					{ ...createClip("clip-2", "track-1"), sortOrder: 1 },
					{ ...createClip("clip-3", "track-1"), sortOrder: 2 },
				],
			};
			const event: EditorEvent = {
				t: "track.clipsReordered",
				trackId: TrackId.make("track-1"),
				clipIds: [
					ClipId.make("clip-3"),
					ClipId.make("clip-1"),
					ClipId.make("clip-2"),
				],
			};

			const result = evolve(project, event);

			const clip1 = result.clips.find((c) => c.id === ClipId.make("clip-1"));
			const clip2 = result.clips.find((c) => c.id === ClipId.make("clip-2"));
			const clip3 = result.clips.find((c) => c.id === ClipId.make("clip-3"));
			expect(clip3?.sortOrder).toBe(0);
			expect(clip1?.sortOrder).toBe(1);
			expect(clip2?.sortOrder).toBe(2);
		});
	});

	describe("clip events", () => {
		it("handles clip.created without pattern", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const clip = createClip("clip-1", "track-1");
			const event: EditorEvent = { t: "clip.created", clip };

			const result = evolve(project, event);

			expect(result.clips).toHaveLength(1);
			expect(result.clips[0].id).toBe(ClipId.make("clip-1"));
		});

		it("handles clip.created with pattern", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const clip = createClip("clip-1", "track-1");
			const pattern = createMidiPattern("pattern-1");
			const event: EditorEvent = { t: "clip.created", clip, pattern };

			const result = evolve(project, event);

			expect(result.clips).toHaveLength(1);
			expect(result.midiPatterns).toHaveLength(1);
			expect(result.midiPatterns[0].id).toBe(PatternId.make("pattern-1"));
		});

		it("handles clip.deleted", () => {
			const project = {
				...createBaseProject(),
				clips: [createClip("clip-1", "track-1")],
			};
			const event: EditorEvent = {
				t: "clip.deleted",
				clipId: ClipId.make("clip-1"),
			};

			const result = evolve(project, event);

			expect(result.clips).toHaveLength(0);
		});

		it("handles clip.moved with start only", () => {
			const project = {
				...createBaseProject(),
				clips: [createClip("clip-1", "track-1")],
			};
			const event: EditorEvent = {
				t: "clip.moved",
				clipId: ClipId.make("clip-1"),
				start: QN.make(8),
			};

			const result = evolve(project, event);

			expect(result.clips[0].span.start).toBe(QN.make(8));
		});

		it("handles clip.moved with track change", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1"), createTrack("track-2")],
				clips: [createClip("clip-1", "track-1")],
			};
			const event: EditorEvent = {
				t: "clip.moved",
				clipId: ClipId.make("clip-1"),
				start: QN.make(8),
				trackId: TrackId.make("track-2"),
			};

			const result = evolve(project, event);

			expect(result.clips[0].span.start).toBe(QN.make(8));
			expect(result.clips[0].trackId).toBe(TrackId.make("track-2"));
		});

		it("handles clip.resized", () => {
			const project = {
				...createBaseProject(),
				clips: [createClip("clip-1", "track-1")],
			};
			const event: EditorEvent = {
				t: "clip.resized",
				clipId: ClipId.make("clip-1"),
				span: { start: QN.make(0), size: QN.make(8) },
			};

			const result = evolve(project, event);

			expect(result.clips[0].span.size).toBe(QN.make(8));
		});

		it("handles clip.loopChanged", () => {
			const project = {
				...createBaseProject(),
				clips: [createClip("clip-1", "track-1")],
			};
			const event: EditorEvent = {
				t: "clip.loopChanged",
				clipId: ClipId.make("clip-1"),
				enabled: true,
				length: QN.make(2),
			};

			const result = evolve(project, event);

			expect(result.clips[0].loop.enabled).toBe(true);
			expect(result.clips[0].loop.length).toBe(QN.make(2));
		});
	});

	describe("midi events", () => {
		it("handles midi.patternRenamed", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [createMidiPattern("pattern-1")],
			};
			const event: EditorEvent = {
				t: "midi.patternRenamed",
				patternId: PatternId.make("pattern-1"),
				name: "New Name",
			};

			const result = evolve(project, event);

			expect(result.midiPatterns[0].name).toBe("New Name");
		});

		it("handles midi.noteAdded", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [createMidiPattern("pattern-1")],
			};
			const note = createMidiNote("note-1");
			const event: EditorEvent = {
				t: "midi.noteAdded",
				patternId: PatternId.make("pattern-1"),
				note,
			};

			const result = evolve(project, event);

			expect(result.midiPatterns[0].notes).toHaveLength(1);
			expect(result.midiPatterns[0].notes[0].id).toBe(NoteId.make("note-1"));
		});

		it("handles midi.noteDeleted", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [
					createMidiPattern("pattern-1", [createMidiNote("note-1")]),
				],
			};
			const event: EditorEvent = {
				t: "midi.noteDeleted",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
			};

			const result = evolve(project, event);

			expect(result.midiPatterns[0].notes).toHaveLength(0);
		});

		it("handles midi.noteMoved", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [
					createMidiPattern("pattern-1", [createMidiNote("note-1")]),
				],
			};
			const event: EditorEvent = {
				t: "midi.noteMoved",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				span: { start: QN.make(4), size: QN.make(2) },
			};

			const result = evolve(project, event);

			expect(result.midiPatterns[0].notes[0].span.start).toBe(QN.make(4));
			expect(result.midiPatterns[0].notes[0].span.size).toBe(QN.make(2));
		});

		it("handles midi.noteVelocityChanged", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [
					createMidiPattern("pattern-1", [createMidiNote("note-1")]),
				],
			};
			const event: EditorEvent = {
				t: "midi.noteVelocityChanged",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				velocity: 80,
			};

			const result = evolve(project, event);

			expect(result.midiPatterns[0].notes[0].velocity).toBe(80);
		});

		it("handles midi.notePitchChanged", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [
					createMidiPattern("pattern-1", [createMidiNote("note-1")]),
				],
			};
			const event: EditorEvent = {
				t: "midi.notePitchChanged",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				pitch: 72,
			};

			const result = evolve(project, event);

			expect(result.midiPatterns[0].notes[0].pitch).toBe(72);
		});
	});

	describe("automation events", () => {
		it("handles automation.laneCreated", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const lane = createAutomationLane("lane-1", "track-1");
			const event: EditorEvent = { t: "automation.laneCreated", lane };

			const result = evolve(project, event);

			expect(result.automationLanes).toHaveLength(1);
			expect(result.automationLanes[0].id).toBe(
				AutomationLaneId.make("lane-1"),
			);
		});

		it("handles automation.laneDeleted", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [createAutomationLane("lane-1", "track-1")],
			};
			const event: EditorEvent = {
				t: "automation.laneDeleted",
				laneId: AutomationLaneId.make("lane-1"),
			};

			const result = evolve(project, event);

			expect(result.automationLanes).toHaveLength(0);
		});

		it("handles automation.pointAdded", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [createAutomationLane("lane-1", "track-1")],
			};
			const point = createAutomationPoint("point-1");
			const event: EditorEvent = {
				t: "automation.pointAdded",
				laneId: AutomationLaneId.make("lane-1"),
				point,
			};

			const result = evolve(project, event);

			expect(result.automationLanes[0].points).toHaveLength(1);
			expect(result.automationLanes[0].points[0].id).toBe(
				AutomationPointId.make("point-1"),
			);
		});

		it("handles automation.pointDeleted", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [
					createAutomationLane("lane-1", "track-1", [
						createAutomationPoint("point-1"),
					]),
				],
			};
			const event: EditorEvent = {
				t: "automation.pointDeleted",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
			};

			const result = evolve(project, event);

			expect(result.automationLanes[0].points).toHaveLength(0);
		});

		it("handles automation.pointMoved with both time and value", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [
					createAutomationLane("lane-1", "track-1", [
						createAutomationPoint("point-1"),
					]),
				],
			};
			const event: EditorEvent = {
				t: "automation.pointMoved",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
				time: QN.make(4),
				value: 0.8,
			};

			const result = evolve(project, event);

			expect(result.automationLanes[0].points[0].timeQN).toBe(QN.make(4));
			expect(result.automationLanes[0].points[0].value).toBe(0.8);
		});

		it("handles automation.pointMoved with time only", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [
					createAutomationLane("lane-1", "track-1", [
						createAutomationPoint("point-1"),
					]),
				],
			};
			const event: EditorEvent = {
				t: "automation.pointMoved",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
				time: QN.make(4),
			};

			const result = evolve(project, event);

			expect(result.automationLanes[0].points[0].timeQN).toBe(QN.make(4));
			expect(result.automationLanes[0].points[0].value).toBe(0.5);
		});

		it("handles automation.pointCurveChanged", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [
					createAutomationLane("lane-1", "track-1", [
						createAutomationPoint("point-1"),
					]),
				],
			};
			const event: EditorEvent = {
				t: "automation.pointCurveChanged",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
				curve: "expo",
			};

			const result = evolve(project, event);

			expect(result.automationLanes[0].points[0].curve).toBe("expo");
		});
	});

	describe("audio file events", () => {
		it("handles audioFile.registered", () => {
			const project = createBaseProject();
			const audioFile = createAudioFile("audio-1");
			const event: EditorEvent = { t: "audioFile.registered", audioFile };

			const result = evolve(project, event);

			expect(result.audioFiles).toHaveLength(1);
			expect(result.audioFiles[0].id).toBe(AudioFileId.make("audio-1"));
		});

		it("handles audioFile.unregistered", () => {
			const project = {
				...createBaseProject(),
				audioFiles: [createAudioFile("audio-1")],
			};
			const event: EditorEvent = {
				t: "audioFile.unregistered",
				audioFileId: AudioFileId.make("audio-1"),
			};

			const result = evolve(project, event);

			expect(result.audioFiles).toHaveLength(0);
		});

		it("handles audioFile.renamed", () => {
			const project = {
				...createBaseProject(),
				audioFiles: [createAudioFile("audio-1")],
			};
			const event: EditorEvent = {
				t: "audioFile.renamed",
				audioFileId: AudioFileId.make("audio-1"),
				name: "new-name.wav",
			};

			const result = evolve(project, event);

			expect(result.audioFiles[0].name).toBe("new-name.wav");
		});
	});
});

describe("Project.decide", () => {
	describe("project commands", () => {
		it("returns project.renamed event for project.rename command", () => {
			const project = createBaseProject();
			const command: EditorCommandPayload = {
				t: "project.rename",
				name: "New Name",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ t: "project.renamed", name: "New Name" });
		});

		it("returns empty array if rename to same name", () => {
			const project = createBaseProject();
			const command: EditorCommandPayload = {
				t: "project.rename",
				name: "Test Project",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(0);
		});

		it("returns project.tempoChanged event for project.setTempo command", () => {
			const project = createBaseProject();
			const command: EditorCommandPayload = { t: "project.setTempo", bpm: 140 };

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ t: "project.tempoChanged", bpm: 140 });
		});

		it("returns empty array if tempo unchanged", () => {
			const project = createBaseProject();
			const command: EditorCommandPayload = { t: "project.setTempo", bpm: 120 };

			const events = decide(project, command);

			expect(events).toHaveLength(0);
		});

		it("returns project.timeSignatureChanged event", () => {
			const project = createBaseProject();
			const command: EditorCommandPayload = {
				t: "project.setTimeSignature",
				timeSignature: { numerator: 3, denominator: 4 as const },
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "project.timeSignatureChanged",
				timeSignature: { numerator: 3, denominator: 4 },
			});
		});

		it("returns project.tracksReordered event", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1"), createTrack("track-2")],
			};
			const command: EditorCommandPayload = {
				t: "project.reorderTracks",
				trackIds: [TrackId.make("track-2"), TrackId.make("track-1")],
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "project.tracksReordered",
				trackIds: [TrackId.make("track-2"), TrackId.make("track-1")],
			});
		});
	});

	describe("track commands", () => {
		it("returns track.created event for track.create command", () => {
			const project = createBaseProject();
			const command: EditorCommandPayload = {
				t: "track.create",
				trackId: Ids.generate("TrackId"),
				type: "midi",
				name: "New Track",
				color: "#00ff00",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0].t).toBe("track.created");
			if (events[0].t === "track.created") {
				expect(events[0].track.name).toBe("New Track");
				expect(events[0].track.type).toBe("midi");
				expect(events[0].track.color).toBe("#00ff00");
			}
		});

		it("returns track.deleted event for track.delete command", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const command: EditorCommandPayload = {
				t: "track.delete",
				trackId: TrackId.make("track-1"),
			};

			const events = decide(project, command);

			expect(events.some((e) => e.t === "track.deleted")).toBe(true);
		});

		it("returns track.renamed event for track.rename command", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { name: "Old" })],
			};
			const command: EditorCommandPayload = {
				t: "track.rename",
				trackId: TrackId.make("track-1"),
				name: "New",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "track.renamed",
				trackId: TrackId.make("track-1"),
				name: "New",
			});
		});

		it("returns track.colorChanged event", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const command: EditorCommandPayload = {
				t: "track.setColor",
				trackId: TrackId.make("track-1"),
				color: "#00ff00",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "track.colorChanged",
				trackId: TrackId.make("track-1"),
				color: "#00ff00",
			});
		});

		it("returns track.volumeChanged event", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const command: EditorCommandPayload = {
				t: "track.setVolume",
				trackId: TrackId.make("track-1"),
				volumeDb: -6,
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "track.volumeChanged",
				trackId: TrackId.make("track-1"),
				volumeDb: -6,
			});
		});

		it("returns track.panChanged event", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const command: EditorCommandPayload = {
				t: "track.setPan",
				trackId: TrackId.make("track-1"),
				pan: 0.5,
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "track.panChanged",
				trackId: TrackId.make("track-1"),
				pan: 0.5,
			});
		});

		it("returns track.muteChanged event", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const command: EditorCommandPayload = {
				t: "track.setMute",
				trackId: TrackId.make("track-1"),
				mute: true,
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "track.muteChanged",
				trackId: TrackId.make("track-1"),
				mute: true,
			});
		});

		it("returns track.soloChanged event", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const command: EditorCommandPayload = {
				t: "track.setSolo",
				trackId: TrackId.make("track-1"),
				solo: true,
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "track.soloChanged",
				trackId: TrackId.make("track-1"),
				solo: true,
			});
		});

		it("returns track.clipsReordered event", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
				clips: [
					createClip("clip-1", "track-1"),
					createClip("clip-2", "track-1"),
				],
			};
			const command: EditorCommandPayload = {
				t: "track.reorderClips",
				trackId: TrackId.make("track-1"),
				clipIds: [ClipId.make("clip-2"), ClipId.make("clip-1")],
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "track.clipsReordered",
				trackId: TrackId.make("track-1"),
				clipIds: [ClipId.make("clip-2"), ClipId.make("clip-1")],
			});
		});
	});

	describe("clip commands", () => {
		it("returns clip.created event for clip.createMidi command", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { type: "midi" })],
			};
			const command: EditorCommandPayload = {
				t: "clip.createMidi",
				trackId: TrackId.make("track-1"),
				clipId: Ids.generate("ClipId"),
				newPatternId: Ids.generate("PatternId"),
				span: { start: QN.make(0), size: QN.make(4) },
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0].t).toBe("clip.created");
			if (events[0].t === "clip.created") {
				expect(events[0].clip.trackId).toBe(TrackId.make("track-1"));
				expect(events[0].pattern).toBeDefined();
			}
		});

		it("returns clip.created event for clip.createAudio command", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1", { type: "audio" })],
				audioFiles: [createAudioFile("audio-1")],
			};
			const command: EditorCommandPayload = {
				t: "clip.createAudio",
				trackId: TrackId.make("track-1"),
				clipId: Ids.generate("ClipId"),
				span: { start: QN.make(0), size: QN.make(4) },
				audioFileId: AudioFileId.make("audio-1"),
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0].t).toBe("clip.created");
			if (events[0].t === "clip.created") {
				expect(events[0].clip.payload.kind).toBe("audio");
			}
		});

		it("returns clip.deleted event for clip.delete command", () => {
			const project = {
				...createBaseProject(),
				clips: [createClip("clip-1", "track-1")],
			};
			const command: EditorCommandPayload = {
				t: "clip.delete",
				clipId: ClipId.make("clip-1"),
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "clip.deleted",
				clipId: ClipId.make("clip-1"),
			});
		});

		it("returns clip.moved event for clip.move command", () => {
			const project = {
				...createBaseProject(),
				clips: [createClip("clip-1", "track-1")],
			};
			const command: EditorCommandPayload = {
				t: "clip.move",
				clipId: ClipId.make("clip-1"),
				startQN: QN.make(8),
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "clip.moved",
				clipId: ClipId.make("clip-1"),
				start: QN.make(8),
			});
		});

		it("returns clip.resized event for clip.resize command", () => {
			const project = {
				...createBaseProject(),
				clips: [createClip("clip-1", "track-1")],
			};
			const command: EditorCommandPayload = {
				t: "clip.resize",
				clipId: ClipId.make("clip-1"),
				span: { start: QN.make(0), size: QN.make(8) },
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "clip.resized",
				clipId: ClipId.make("clip-1"),
				span: { start: QN.make(0), size: QN.make(8) },
			});
		});

		it("returns clip.loopChanged event for clip.setLoop command", () => {
			const project = {
				...createBaseProject(),
				clips: [createClip("clip-1", "track-1")],
			};
			const command: EditorCommandPayload = {
				t: "clip.setLoop",
				clipId: ClipId.make("clip-1"),
				enabled: true,
				length: QN.make(2),
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "clip.loopChanged",
				clipId: ClipId.make("clip-1"),
				enabled: true,
				length: QN.make(2),
			});
		});
	});

	describe("midi commands", () => {
		it("returns midi.patternRenamed event", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [createMidiPattern("pattern-1")],
			};
			const command: EditorCommandPayload = {
				t: "midi.renamePattern",
				patternId: PatternId.make("pattern-1"),
				name: "New Name",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "midi.patternRenamed",
				patternId: PatternId.make("pattern-1"),
				name: "New Name",
			});
		});

		it("returns midi.noteAdded event", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [createMidiPattern("pattern-1")],
			};
			const command: EditorCommandPayload = {
				t: "midi.addNote",
				patternId: PatternId.make("pattern-1"),
				noteId: Ids.generate("NoteId"),
				pitch: 60,
				velocity: 100,
				span: { start: QN.make(0), size: QN.make(1) },
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0].t).toBe("midi.noteAdded");
			if (events[0].t === "midi.noteAdded") {
				expect(events[0].note.pitch).toBe(60);
				expect(events[0].note.velocity).toBe(100);
			}
		});

		it("returns midi.noteDeleted event", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [
					createMidiPattern("pattern-1", [createMidiNote("note-1")]),
				],
			};
			const command: EditorCommandPayload = {
				t: "midi.deleteNote",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "midi.noteDeleted",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
			});
		});

		it("returns midi.noteMoved event", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [
					createMidiPattern("pattern-1", [createMidiNote("note-1")]),
				],
			};
			const command: EditorCommandPayload = {
				t: "midi.moveNote",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				span: { start: QN.make(4), size: QN.make(2) },
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "midi.noteMoved",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				span: { start: QN.make(4), size: QN.make(2) },
			});
		});

		it("returns midi.noteVelocityChanged event", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [
					createMidiPattern("pattern-1", [createMidiNote("note-1")]),
				],
			};
			const command: EditorCommandPayload = {
				t: "midi.setNoteVelocity",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				velocity: 80,
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "midi.noteVelocityChanged",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				velocity: 80,
			});
		});

		it("returns midi.notePitchChanged event", () => {
			const project = {
				...createBaseProject(),
				midiPatterns: [
					createMidiPattern("pattern-1", [createMidiNote("note-1")]),
				],
			};
			const command: EditorCommandPayload = {
				t: "midi.setNotePitch",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				pitch: 72,
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "midi.notePitchChanged",
				patternId: PatternId.make("pattern-1"),
				noteId: NoteId.make("note-1"),
				pitch: 72,
			});
		});
	});

	describe("automation commands", () => {
		it("returns automation.laneCreated event", () => {
			const project = {
				...createBaseProject(),
				tracks: [createTrack("track-1")],
			};
			const command: EditorCommandPayload = {
				t: "automation.createLane",
				trackId: TrackId.make("track-1"),
				laneId: Ids.generate("AutomationLaneId"),
				paramPath: "volume",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0].t).toBe("automation.laneCreated");
			if (events[0].t === "automation.laneCreated") {
				expect(events[0].lane.trackId).toBe(TrackId.make("track-1"));
				expect(events[0].lane.paramPath).toBe("volume");
			}
		});

		it("returns automation.laneDeleted event", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [createAutomationLane("lane-1", "track-1")],
			};
			const command: EditorCommandPayload = {
				t: "automation.deleteLane",
				laneId: AutomationLaneId.make("lane-1"),
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "automation.laneDeleted",
				laneId: AutomationLaneId.make("lane-1"),
			});
		});

		it("returns automation.pointAdded event", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [createAutomationLane("lane-1", "track-1")],
			};
			const command: EditorCommandPayload = {
				t: "automation.addPoint",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: Ids.generate("AutomationPointId"),
				timeQN: QN.make(4),
				value: 0.8,
				curve: "expo",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0].t).toBe("automation.pointAdded");
			if (events[0].t === "automation.pointAdded") {
				expect(events[0].point.timeQN).toBe(QN.make(4));
				expect(events[0].point.value).toBe(0.8);
				expect(events[0].point.curve).toBe("expo");
			}
		});

		it("returns automation.pointDeleted event", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [
					createAutomationLane("lane-1", "track-1", [
						createAutomationPoint("point-1"),
					]),
				],
			};
			const command: EditorCommandPayload = {
				t: "automation.deletePoint",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "automation.pointDeleted",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
			});
		});

		it("returns automation.pointMoved event", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [
					createAutomationLane("lane-1", "track-1", [
						createAutomationPoint("point-1"),
					]),
				],
			};
			const command: EditorCommandPayload = {
				t: "automation.movePoint",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
				timeQN: QN.make(4),
				value: 0.8,
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "automation.pointMoved",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
				time: QN.make(4),
				value: 0.8,
			});
		});

		it("returns automation.pointCurveChanged event", () => {
			const project = {
				...createBaseProject(),
				automationLanes: [
					createAutomationLane("lane-1", "track-1", [
						createAutomationPoint("point-1"),
					]),
				],
			};
			const command: EditorCommandPayload = {
				t: "automation.setPointCurve",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
				curve: "log",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "automation.pointCurveChanged",
				laneId: AutomationLaneId.make("lane-1"),
				pointId: AutomationPointId.make("point-1"),
				curve: "log",
			});
		});
	});

	describe("audio file commands", () => {
		it("returns audioFile.registered event", () => {
			const project = createBaseProject();
			const command: EditorCommandPayload = {
				t: "audioFile.register",
				audioFileId: Ids.generate("AudioFileId"),
				sourcePath: "/path/to/audio.wav",
				name: "audio.wav",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0].t).toBe("audioFile.registered");
			if (events[0].t === "audioFile.registered") {
				expect(events[0].audioFile.originalPath).toBe("/path/to/audio.wav");
				expect(events[0].audioFile.name).toBe("audio.wav");
			}
		});

		it("returns audioFile.unregistered event", () => {
			const project = {
				...createBaseProject(),
				audioFiles: [createAudioFile("audio-1")],
			};
			const command: EditorCommandPayload = {
				t: "audioFile.unregister",
				audioFileId: AudioFileId.make("audio-1"),
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "audioFile.unregistered",
				audioFileId: AudioFileId.make("audio-1"),
			});
		});

		it("returns audioFile.renamed event", () => {
			const project = {
				...createBaseProject(),
				audioFiles: [createAudioFile("audio-1")],
			};
			const command: EditorCommandPayload = {
				t: "audioFile.rename",
				audioFileId: AudioFileId.make("audio-1"),
				name: "new-name.wav",
			};

			const events = decide(project, command);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				t: "audioFile.renamed",
				audioFileId: AudioFileId.make("audio-1"),
				name: "new-name.wav",
			});
		});
	});
});
