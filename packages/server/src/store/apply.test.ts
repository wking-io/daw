import { describe, expect, it } from "bun:test";
import type { Commands, Events, ProjectId } from "@daw/contract";
import { applyCommand, emptyState } from "./apply";

const testProjectId = "test-project" as ProjectId;

describe("applyCommand", () => {
	it("renames a project and emits an event", () => {
		const state = emptyState(testProjectId, "Initial");
		const payload: Commands.ProjectRename = {
			t: "project.rename",
			name: "New Name",
		};

		const result = applyCommand(state, 1, payload);

		expect(result.state.project.name).toBe("New Name");
		expect(result.events.version).toBe(1);
		expect(result.events.events[0]?.t).toBe("project.renamed");
	});

	it("changes tempo and emits an event", () => {
		const state = emptyState(testProjectId, "Test");
		const payload: Commands.ProjectSetTempo = {
			t: "project.setTempo",
			bpm: 140,
		};

		const result = applyCommand(state, 1, payload);

		expect(result.state.project.bpm).toBe(140);
		expect(result.events.version).toBe(1);
		expect(result.events.events[0]?.t).toBe("project.tempoChanged");
	});
});
