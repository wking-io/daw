import { describe, expect, it } from "bun:test";
import type { Events } from "@daw/core";
import { compileAudioDeltas } from "./compile-audio";

describe("compileAudioDeltas", () => {
	it("returns nothing (stubbed)", () => {
		const batch: Events.EventBatch = {
			version: 1,
			events: [{ t: "project.renamed", name: "Test" }],
		};
		// Currently stubbed - returns void
		expect(() => compileAudioDeltas(batch)).not.toThrow();
	});
});
