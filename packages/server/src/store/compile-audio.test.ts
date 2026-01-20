import { describe, expect, it } from "bun:test";
import type { Patches } from "@daw/contract";
import { compileAudioDeltas } from "./compile-audio";

describe("compileAudioDeltas", () => {
	it("returns nothing (stubbed)", () => {
		const batch: Patches.PatchBatch = {
			version: 1,
			patches: [{ t: "project.renamed", name: "Test" }],
		};
		// Currently stubbed - returns void
		expect(() => compileAudioDeltas(batch)).not.toThrow();
	});
});
