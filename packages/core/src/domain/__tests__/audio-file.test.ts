import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import type { AudioFileId, ProjectId } from "../../ids";
import { AudioFile } from "../audio-file";

describe("AudioFile schema", () => {
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
		const decoded = Schema.decodeUnknownSync(AudioFile)(validAudioFile);
		expect(decoded.id).toBe("audio-1" as AudioFileId);
		expect(decoded.name).toBe("kick.wav");
		expect(decoded.durationSec).toBe(0.5);
	});
});
