import { describe, expect, it } from "bun:test";
import type { Project } from "@daw/contract";
import { compileAudioDeltas } from "./compile-audio";

describe("compileAudioDeltas", () => {
	it("returns empty deltas for now", () => {
		const batch: Project.PatchBatch = {
			version: 5,
			patches: [],
		};

		const result = compileAudioDeltas(batch);

		expect(result.version).toBe(5);
		expect(result.deltas).toHaveLength(0);
	});
});
