import { describe, expect, it } from "bun:test";
import type { Project } from "@daw/contract";
import { applyOp, emptyDoc } from "./apply";

describe("applyOp", () => {
	it("creates an instrument and emits a patch", () => {
		const op: Project.Op = {
			t: "instrument.create",
			type: "synth",
			name: "Bass",
		};

		const result = applyOp(emptyDoc, 1, op);

		expect(result.doc.instruments).toHaveLength(1);
		expect(result.doc.instruments[0]?.name).toBe("Bass");
		expect(result.patches.version).toBe(1);
		expect(result.patches.patches[0]?.t).toBe("instrument.add");
		expect(result.audioDeltas.deltas).toHaveLength(0);
	});
});
