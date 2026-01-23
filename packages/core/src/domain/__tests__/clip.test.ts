import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import type {
	AudioFileId,
	ClipId,
	PatternId,
	ProjectId,
	TrackId,
} from "../../ids";
import { Clip } from "../clip";
import type { QN } from "../qn";

describe("Clip schema", () => {
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
		const decoded = Schema.decodeUnknownSync(Clip)(validMidiClip);
		expect(decoded.id).toBe("clip-1" as ClipId);
		expect(decoded.payload.kind).toBe("midi");
		if (decoded.payload.kind === "midi") {
			expect(decoded.payload.patternId).toBe("pattern-1" as PatternId);
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
		const decoded = Schema.decodeUnknownSync(Clip)(audioClip);
		expect(decoded.payload.kind).toBe("audio");
		if (decoded.payload.kind === "audio") {
			expect(decoded.payload.audioFileId).toBe("audio-1" as AudioFileId);
		}
	});
});
