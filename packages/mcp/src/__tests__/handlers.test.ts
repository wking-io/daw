import type { Commands, Events, ProjectId } from "@daw/contract";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { handleCreateTrack } from "../instruments/handlers";
import { DawRepository, OperationFailedError } from "../instruments/repo";

describe("mcp tool handlers", () => {
	it("returns stubbed response for track creation", async () => {
		const commandCalls: Array<{
			projectId: string;
			command: Commands.Command;
		}> = [];

		const executeCommand = (projectId: string, command: Commands.Command) => {
			commandCalls.push({ projectId, command });
			return Effect.succeed({
				version: 1,
				events: { version: 1, events: [] },
			} as Events.CommandResult);
		};

		const stubRepo = DawRepository.of({
			executeCommand,
			submitOperation: executeCommand,
		});

		const result = await Effect.runPromise(
			handleCreateTrack({
				projectId: "proj-1",
				trackType: "midi",
				name: "Bass",
			}).pipe(Effect.provideService(DawRepository, stubRepo)),
		);

		// Currently stubbed to return ok:false
		expect(result.ok).toBe(false);
		expect(result.error).toBe(
			"Not implemented - track creation needs operation submission",
		);
	});

	it("returns ok:false when repository would fail (stubbed)", async () => {
		const executeCommand = () =>
			Effect.fail(new OperationFailedError({ message: "Operation rejected" }));

		const stubRepo = DawRepository.of({
			executeCommand,
			submitOperation: executeCommand,
		});

		const result = await Effect.runPromise(
			handleCreateTrack({
				projectId: "proj-1",
				trackType: "midi",
				name: "Bass",
			}).pipe(Effect.provideService(DawRepository, stubRepo)),
		);

		// Currently stubbed - doesn't actually call the repo
		expect(result.ok).toBe(false);
	});
});
