import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import * as Events from "../events";
import type {
	AudioFileId,
	AutomationLaneId,
	AutomationPointId,
	ClipId,
	NoteId,
	PatternId,
	ProjectId,
	QN,
	TrackId,
} from "../ids";

describe("events schemas", () => {
	// Helper to create a valid project for events
	const makeProject = () => ({
		id: "proj-123" as ProjectId,
		name: "Test Project",
		createdAt: Date.now(),
		updatedAt: Date.now(),
		bpm: 120,
		timeSignature: { numerator: 4, denominator: 4 as const },
	});

	// Helper to create a valid track
	const makeTrack = () => ({
		id: "track-1" as TrackId,
		projectId: "proj-123" as ProjectId,
		type: "midi" as const,
		name: "Track 1",
		color: "#ff0000",
		volumeDb: 0,
		pan: 0,
		mute: false,
		solo: false,
		sortOrder: 0,
		deviceIds: [],
	});

	describe("Project events", () => {
		it("decodes ProjectCreated", () => {
			const event = { t: "project.created", project: makeProject() };
			const decoded = Schema.decodeUnknownSync(Events.ProjectCreated)(event);
			expect(decoded.t).toBe("project.created");
			expect(decoded.project.id).toBe("proj-123");
		});

		it("decodes ProjectDeleted", () => {
			const event = {
				t: "project.deleted",
				projectId: "proj-123" as ProjectId,
			};
			const decoded = Schema.decodeUnknownSync(Events.ProjectDeleted)(event);
			expect(decoded.t).toBe("project.deleted");
		});

		it("decodes ProjectRenamed", () => {
			const event = { t: "project.renamed", name: "New Name" };
			const decoded = Schema.decodeUnknownSync(Events.ProjectRenamed)(event);
			expect(decoded.t).toBe("project.renamed");
			expect(decoded.name).toBe("New Name");
		});

		it("decodes ProjectTempoChanged", () => {
			const event = { t: "project.tempoChanged", bpm: 140 };
			const decoded = Schema.decodeUnknownSync(Events.ProjectTempoChanged)(
				event,
			);
			expect(decoded.t).toBe("project.tempoChanged");
			expect(decoded.bpm).toBe(140);
		});

		it("decodes ProjectTimeSignatureChanged", () => {
			const event = {
				t: "project.timeSignatureChanged",
				timeSignature: { numerator: 3, denominator: 4 as const },
			};
			const decoded = Schema.decodeUnknownSync(
				Events.ProjectTimeSignatureChanged,
			)(event);
			expect(decoded.t).toBe("project.timeSignatureChanged");
			expect(decoded.timeSignature.numerator).toBe(3);
		});
	});

	describe("Track events", () => {
		it("decodes TrackCreated", () => {
			const event = { t: "track.created", track: makeTrack() };
			const decoded = Schema.decodeUnknownSync(Events.TrackCreated)(event);
			expect(decoded.t).toBe("track.created");
			expect(decoded.track.name).toBe("Track 1");
		});

		it("decodes TrackDeleted", () => {
			const event = { t: "track.deleted", trackId: "track-1" as TrackId };
			const decoded = Schema.decodeUnknownSync(Events.TrackDeleted)(event);
			expect(decoded.t).toBe("track.deleted");
		});

		it("decodes TrackRenamed", () => {
			const event = {
				t: "track.renamed",
				trackId: "track-1" as TrackId,
				name: "New Track Name",
			};
			const decoded = Schema.decodeUnknownSync(Events.TrackRenamed)(event);
			expect(decoded.t).toBe("track.renamed");
			expect(decoded.name).toBe("New Track Name");
		});

		it("decodes TrackVolumeChanged", () => {
			const event = {
				t: "track.volumeChanged",
				trackId: "track-1" as TrackId,
				volumeDb: -6,
			};
			const decoded = Schema.decodeUnknownSync(Events.TrackVolumeChanged)(
				event,
			);
			expect(decoded.volumeDb).toBe(-6);
		});

		it("decodes TrackPanChanged", () => {
			const event = {
				t: "track.panChanged",
				trackId: "track-1" as TrackId,
				pan: 0.5,
			};
			const decoded = Schema.decodeUnknownSync(Events.TrackPanChanged)(event);
			expect(decoded.pan).toBe(0.5);
		});

		it("decodes TrackMuteChanged", () => {
			const event = {
				t: "track.muteChanged",
				trackId: "track-1" as TrackId,
				mute: true,
			};
			const decoded = Schema.decodeUnknownSync(Events.TrackMuteChanged)(event);
			expect(decoded.mute).toBe(true);
		});

		it("decodes TrackSoloChanged", () => {
			const event = {
				t: "track.soloChanged",
				trackId: "track-1" as TrackId,
				solo: true,
			};
			const decoded = Schema.decodeUnknownSync(Events.TrackSoloChanged)(event);
			expect(decoded.solo).toBe(true);
		});
	});

	describe("Clip events", () => {
		it("decodes ClipMoved", () => {
			const event = {
				t: "clip.moved",
				clipId: "clip-1" as ClipId,
				startQN: 4 as QN,
			};
			const decoded = Schema.decodeUnknownSync(Events.ClipMoved)(event);
			expect(decoded.t).toBe("clip.moved");
			expect(decoded.startQN).toBe(4);
		});

		it("decodes ClipMoved with optional trackId", () => {
			const event = {
				t: "clip.moved",
				clipId: "clip-1" as ClipId,
				startQN: 4 as QN,
				trackId: "track-2" as TrackId,
			};
			const decoded = Schema.decodeUnknownSync(Events.ClipMoved)(event);
			expect(decoded.trackId).toBe("track-2");
		});

		it("decodes ClipResized", () => {
			const event = {
				t: "clip.resized",
				clipId: "clip-1" as ClipId,
				span: { start: 0 as QN, size: 8 as QN },
			};
			const decoded = Schema.decodeUnknownSync(Events.ClipResized)(event);
			expect(decoded.span.size).toBe(8);
		});

		it("decodes ClipLoopChanged", () => {
			const event = {
				t: "clip.loopChanged",
				clipId: "clip-1" as ClipId,
				enabled: true,
				length: 4 as QN,
			};
			const decoded = Schema.decodeUnknownSync(Events.ClipLoopChanged)(event);
			expect(decoded.enabled).toBe(true);
			expect(decoded.length).toBe(4);
		});
	});

	describe("MIDI events", () => {
		it("decodes MidiNoteAdded", () => {
			const event = {
				t: "midi.noteAdded",
				patternId: "pattern-1" as PatternId,
				note: {
					id: "note-1" as NoteId,
					pitch: 60,
					velocity: 100,
					span: { start: 0 as QN, size: 1 as QN },
				},
			};
			const decoded = Schema.decodeUnknownSync(Events.MidiNoteAdded)(event);
			expect(decoded.note.pitch).toBe(60);
		});

		it("decodes MidiNoteDeleted", () => {
			const event = {
				t: "midi.noteDeleted",
				patternId: "pattern-1" as PatternId,
				noteId: "note-1" as NoteId,
			};
			const decoded = Schema.decodeUnknownSync(Events.MidiNoteDeleted)(event);
			expect(decoded.noteId).toBe("note-1");
		});

		it("decodes MidiNotePitchChanged", () => {
			const event = {
				t: "midi.notePitchChanged",
				patternId: "pattern-1" as PatternId,
				noteId: "note-1" as NoteId,
				pitch: 72,
			};
			const decoded = Schema.decodeUnknownSync(Events.MidiNotePitchChanged)(
				event,
			);
			expect(decoded.pitch).toBe(72);
		});
	});

	describe("Automation events", () => {
		it("decodes AutomationPointAdded", () => {
			const event = {
				t: "automation.pointAdded",
				laneId: "lane-1" as AutomationLaneId,
				point: {
					id: "point-1" as AutomationPointId,
					timeQN: 0 as QN,
					value: 0.5,
					curve: "linear" as const,
				},
			};
			const decoded = Schema.decodeUnknownSync(Events.AutomationPointAdded)(
				event,
			);
			expect(decoded.point.value).toBe(0.5);
		});

		it("decodes AutomationPointMoved", () => {
			const event = {
				t: "automation.pointMoved",
				laneId: "lane-1" as AutomationLaneId,
				pointId: "point-1" as AutomationPointId,
				timeQN: 4 as QN,
				value: 0.75,
			};
			const decoded = Schema.decodeUnknownSync(Events.AutomationPointMoved)(
				event,
			);
			expect(decoded.timeQN).toBe(4);
			expect(decoded.value).toBe(0.75);
		});
	});

	describe("Audio file events", () => {
		it("decodes AudioFileRegistered", () => {
			const event = {
				t: "audioFile.registered",
				audioFile: {
					id: "audio-1" as AudioFileId,
					projectId: "proj-123" as ProjectId,
					name: "kick.wav",
					originalPath: "/sounds/kick.wav",
					storedPath: "/stored/kick.wav",
					durationSec: 0.5,
					sampleRate: 44100,
					channels: 2,
				},
			};
			const decoded = Schema.decodeUnknownSync(Events.AudioFileRegistered)(
				event,
			);
			expect(decoded.audioFile.name).toBe("kick.wav");
		});

		it("decodes AudioFileRenamed", () => {
			const event = {
				t: "audioFile.renamed",
				audioFileId: "audio-1" as AudioFileId,
				name: "snare.wav",
			};
			const decoded = Schema.decodeUnknownSync(Events.AudioFileRenamed)(event);
			expect(decoded.name).toBe("snare.wav");
		});
	});

	describe("Event union", () => {
		it("decodes any valid event type", () => {
			const events = [
				{ t: "project.renamed", name: "New Name" },
				{ t: "track.deleted", trackId: "track-1" },
				{ t: "clip.deleted", clipId: "clip-1" },
			];

			for (const event of events) {
				const decoded = Schema.decodeUnknownSync(Events.Event)(event);
				expect(decoded.t).toBe(event.t);
			}
		});

		it("rejects unknown event types", () => {
			expect(() =>
				Schema.decodeUnknownSync(Events.Event)({ t: "unknown.event" }),
			).toThrow();
		});
	});

	describe("EventBatch", () => {
		it("decodes valid event batch", () => {
			const batch = {
				version: 1,
				events: [
					{ t: "project.renamed", name: "New Name" },
					{ t: "project.tempoChanged", bpm: 140 },
				],
			};
			const decoded = Schema.decodeUnknownSync(Events.EventBatch)(batch);
			expect(decoded.version).toBe(1);
			expect(decoded.events).toHaveLength(2);
		});

		it("accepts empty events array", () => {
			const batch = { version: 1, events: [] };
			const decoded = Schema.decodeUnknownSync(Events.EventBatch)(batch);
			expect(decoded.events).toHaveLength(0);
		});
	});

	describe("Snapshot", () => {
		it("decodes valid snapshot", () => {
			const snapshot = {
				version: 1,
				project: makeProject(),
				tracks: [makeTrack()],
				clips: [],
				midiPatterns: [],
				automationLanes: [],
				audioFiles: [],
			};
			const decoded = Schema.decodeUnknownSync(Events.Snapshot)(snapshot);
			expect(decoded.version).toBe(1);
			expect(decoded.tracks).toHaveLength(1);
		});

		it("decodes snapshot with all entity types", () => {
			const snapshot = {
				version: 5,
				project: makeProject(),
				tracks: [makeTrack()],
				clips: [
					{
						id: "clip-1" as ClipId,
						projectId: "proj-123" as ProjectId,
						trackId: "track-1" as TrackId,
						span: { start: 0 as QN, size: 4 as QN },
						loop: { enabled: false, length: 4 as QN },
						sortOrder: 0,
						payload: {
							kind: "midi" as const,
							patternId: "pattern-1" as PatternId,
						},
					},
				],
				midiPatterns: [
					{
						id: "pattern-1" as PatternId,
						projectId: "proj-123" as ProjectId,
						name: "Pattern 1",
						notes: [],
					},
				],
				automationLanes: [],
				audioFiles: [],
			};
			const decoded = Schema.decodeUnknownSync(Events.Snapshot)(snapshot);
			expect(decoded.clips).toHaveLength(1);
			expect(decoded.midiPatterns).toHaveLength(1);
		});
	});

	describe("CommandResult", () => {
		it("decodes valid command result", () => {
			const result = {
				version: 2,
				events: {
					version: 2,
					events: [{ t: "project.renamed", name: "New Name" }],
				},
			};
			const decoded = Schema.decodeUnknownSync(Events.CommandResult)(result);
			expect(decoded.version).toBe(2);
			expect(decoded.events.events).toHaveLength(1);
		});
	});
});
