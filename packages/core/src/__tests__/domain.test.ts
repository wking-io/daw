import { Domain } from "@daw/core";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
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

describe("domain schemas", () => {
	describe("Project", () => {
		const validProject = {
			id: "proj-123" as ProjectId,
			name: "My Project",
			createdAt: 1704067200000, // 2024-01-01
			updatedAt: 1704153600000, // 2024-01-02
			bpm: 120,
			timeSignature: { numerator: 4, denominator: 4 as const },
		};

		it("decodes valid project", () => {
			const decoded = Schema.decodeUnknownSync(Domain.Project)(validProject);
			expect(decoded.id).toBe("proj-123");
			expect(decoded.name).toBe("My Project");
			expect(decoded.bpm).toBe(120);
			expect(decoded.createdAt).toBeInstanceOf(Date);
			expect(decoded.updatedAt).toBeInstanceOf(Date);
		});

		it("encodes project back to JSON format", () => {
			const decoded = Schema.decodeUnknownSync(Domain.Project)(validProject);
			const encoded = Schema.encodeSync(Domain.Project)(decoded);
			expect(encoded.createdAt).toBe(1704067200000);
			expect(encoded.updatedAt).toBe(1704153600000);
		});

		it("rejects bpm below 20", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.Project)({ ...validProject, bpm: 19 }),
			).toThrow();
		});

		it("rejects bpm above 999", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.Project)({
					...validProject,
					bpm: 1000,
				}),
			).toThrow();
		});
	});

	describe("Track", () => {
		const validTrack = {
			id: "track-1" as TrackId,
			projectId: "proj-123" as ProjectId,
			type: "midi" as const,
			name: "Bass",
			color: "#ff0000",
			volumeDb: -6,
			pan: 0,
			mute: false,
			solo: false,
			sortOrder: 0,
			deviceIds: [],
		};

		it("decodes valid track", () => {
			const decoded = Schema.decodeUnknownSync(Domain.Track)(validTrack);
			expect(decoded.id).toBe("track-1");
			expect(decoded.type).toBe("midi");
			expect(decoded.name).toBe("Bass");
		});

		it("accepts audio track type", () => {
			const decoded = Schema.decodeUnknownSync(Domain.Track)({
				...validTrack,
				type: "audio",
			});
			expect(decoded.type).toBe("audio");
		});

		it("accepts bus track type", () => {
			const decoded = Schema.decodeUnknownSync(Domain.Track)({
				...validTrack,
				type: "bus",
			});
			expect(decoded.type).toBe("bus");
		});

		it("rejects invalid track type", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.Track)({
					...validTrack,
					type: "invalid",
				}),
			).toThrow();
		});

		it("rejects pan below -1", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.Track)({ ...validTrack, pan: -1.5 }),
			).toThrow();
		});

		it("rejects pan above 1", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.Track)({ ...validTrack, pan: 1.5 }),
			).toThrow();
		});
	});

	describe("Clip", () => {
		const validMidiClip = {
			id: "clip-1" as ClipId,
			projectId: "proj-123" as ProjectId,
			trackId: "track-1" as TrackId,
			span: { start: 0 as QN, size: 4 as QN },
			loop: { enabled: false, length: 4 as QN },
			sortOrder: 0,
			payload: { kind: "midi" as const, patternId: "pattern-1" as PatternId },
		};

		it("decodes valid midi clip", () => {
			const decoded = Schema.decodeUnknownSync(Domain.Clip)(validMidiClip);
			expect(decoded.id).toBe("clip-1");
			expect(decoded.payload.kind).toBe("midi");
			if (decoded.payload.kind === "midi") {
				expect(decoded.payload.patternId).toBe("pattern-1");
			}
		});

		it("decodes valid audio clip", () => {
			const audioClip = {
				...validMidiClip,
				payload: {
					kind: "audio" as const,
					audioFileId: "audio-1" as AudioFileId,
					offsetSec: 0,
				},
			};
			const decoded = Schema.decodeUnknownSync(Domain.Clip)(audioClip);
			expect(decoded.payload.kind).toBe("audio");
			if (decoded.payload.kind === "audio") {
				expect(decoded.payload.audioFileId).toBe("audio-1");
			}
		});
	});

	describe("MidiNote", () => {
		const validNote = {
			id: "note-1" as NoteId,
			pitch: 60,
			velocity: 100,
			span: { start: 0 as QN, size: 1 as QN },
		};

		it("decodes valid midi note", () => {
			const decoded = Schema.decodeUnknownSync(Domain.MidiNote)(validNote);
			expect(decoded.pitch).toBe(60);
			expect(decoded.velocity).toBe(100);
		});

		it("rejects pitch below 0", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.MidiNote)({ ...validNote, pitch: -1 }),
			).toThrow();
		});

		it("rejects pitch above 127", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.MidiNote)({ ...validNote, pitch: 128 }),
			).toThrow();
		});

		it("rejects non-integer pitch", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.MidiNote)({
					...validNote,
					pitch: 60.5,
				}),
			).toThrow();
		});

		it("rejects velocity below 0", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.MidiNote)({
					...validNote,
					velocity: -1,
				}),
			).toThrow();
		});

		it("rejects velocity above 127", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.MidiNote)({
					...validNote,
					velocity: 128,
				}),
			).toThrow();
		});
	});

	describe("MidiPattern", () => {
		const validPattern = {
			id: "pattern-1" as PatternId,
			projectId: "proj-123" as ProjectId,
			name: "Bassline",
			notes: [
				{
					id: "note-1" as NoteId,
					pitch: 36,
					velocity: 100,
					span: { start: 0 as QN, size: 1 as QN },
				},
			],
		};

		it("decodes valid midi pattern", () => {
			const decoded = Schema.decodeUnknownSync(Domain.MidiPattern)(
				validPattern,
			);
			expect(decoded.id).toBe("pattern-1");
			expect(decoded.name).toBe("Bassline");
			expect(decoded.notes).toHaveLength(1);
		});

		it("accepts empty notes array", () => {
			const decoded = Schema.decodeUnknownSync(Domain.MidiPattern)({
				...validPattern,
				notes: [],
			});
			expect(decoded.notes).toHaveLength(0);
		});
	});

	describe("AutomationLane", () => {
		const validLane = {
			id: "lane-1" as AutomationLaneId,
			projectId: "proj-123" as ProjectId,
			trackId: "track-1" as TrackId,
			paramPath: "volume",
			points: [],
		};

		it("decodes valid automation lane", () => {
			const decoded = Schema.decodeUnknownSync(Domain.AutomationLane)(
				validLane,
			);
			expect(decoded.id).toBe("lane-1");
			expect(decoded.paramPath).toBe("volume");
		});
	});

	describe("AutomationPoint", () => {
		const validPoint = {
			id: "point-1" as AutomationPointId,
			timeQN: 0 as QN,
			value: 0.5,
			curve: "linear" as const,
		};

		it("decodes valid automation point", () => {
			const decoded = Schema.decodeUnknownSync(Domain.AutomationPoint)(
				validPoint,
			);
			expect(decoded.id).toBe("point-1");
			expect(decoded.value).toBe(0.5);
			expect(decoded.curve).toBe("linear");
		});

		it("accepts different curve types", () => {
			// Actual curve types: "linear", "expo", "log", "hold"
			for (const curve of ["linear", "expo", "log", "hold"] as const) {
				const decoded = Schema.decodeUnknownSync(Domain.AutomationPoint)({
					...validPoint,
					curve,
				});
				expect(decoded.curve).toBe(curve);
			}
		});

		it("rejects invalid curve type", () => {
			expect(() =>
				Schema.decodeUnknownSync(Domain.AutomationPoint)({
					...validPoint,
					curve: "invalid",
				}),
			).toThrow();
		});
	});

	describe("AudioFile", () => {
		const validAudioFile = {
			id: "audio-1" as AudioFileId,
			projectId: "proj-123" as ProjectId,
			name: "kick.wav",
			originalPath: "/sounds/kick.wav",
			storedPath: "/stored/kick.wav",
			durationSec: 0.5,
			sampleRate: 44100,
			channels: 2,
		};

		it("decodes valid audio file", () => {
			const decoded = Schema.decodeUnknownSync(Domain.AudioFile)(
				validAudioFile,
			);
			expect(decoded.id).toBe("audio-1");
			expect(decoded.name).toBe("kick.wav");
			expect(decoded.durationSec).toBe(0.5);
		});
	});
});
