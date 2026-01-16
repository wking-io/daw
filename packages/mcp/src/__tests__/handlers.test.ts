import type { Instrument, Project } from "@daw/contract";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DawStateClient } from "../dawIpcClient";
import { handleCreateInstrument } from "../handlers";

describe("mcp tool handlers", () => {
	it("submits instrument.create via DawStateClient and decodes success", async () => {
		const submits: Project.Submit[] = [];

		const stubClient = DawStateClient.of({
			getSnapshot: () =>
				Effect.succeed({ version: 0, doc: { instruments: [] } }),
			submitOp: (req) => {
				submits.push(req);
				return Effect.succeed({
					version: 1,
					patches: {
						version: 1,
						patches: [
							{
								t: "instrument.add",
								instrument: {
									id: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as Instrument.InstrumentId,
									type: "synth",
									name: "Bass",
									params: {},
									createdAt: new Date(),
								},
							},
						],
					},
					audioDeltas: {
						version: 1,
						deltas: [],
					},
				});
			},
		});

		const result = await Effect.runPromise(
			handleCreateInstrument({ type: "synth", name: "Bass" }).pipe(
				Effect.provideService(DawStateClient, stubClient),
			),
		);

		expect(submits).toHaveLength(1);
		expect(submits[0]?.op).toEqual(
			expect.objectContaining({
				t: "instrument.create",
				type: "synth",
				name: "Bass",
				preset: undefined,
				instrumentId: expect.any(String),
				createdAt: expect.any(Number),
			}),
		);
		expect(result.ok).toBe(true);
	});

	it("returns ok:false when the IPC response doesn't match the contract schema", async () => {
		const stubClient = DawStateClient.of({
			getSnapshot: () =>
				Effect.succeed({ version: 0, doc: { instruments: [] } }),
			submitOp: () =>
				Effect.succeed({
					version: 1,
					patches: {
						version: 1,
						patches: [],
					},
					audioDeltas: {
						version: 1,
						deltas: [],
					},
				}),
		});

		const result = await Effect.runPromise(
			handleCreateInstrument({ type: "synth", name: "Bass" }).pipe(
				Effect.provideService(DawStateClient, stubClient),
			),
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBeTypeOf("string");
			expect(result.error.length).toBeGreaterThan(0);
		}
	});
});
