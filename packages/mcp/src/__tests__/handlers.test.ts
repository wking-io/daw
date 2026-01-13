import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { DawCommandHttpRequest } from "../dawIpcClient";
import { DawIpcClient } from "../dawIpcClient";
import { handleCreateInstrument } from "../handlers";

describe("mcp tool handlers", () => {
	it("sends daw.instrument.create via DawIpcClient and decodes success", async () => {
		const calls: DawCommandHttpRequest[] = [];

		const stubIpc = DawIpcClient.of({
			postCommand: (req) => {
				calls.push(req);
				return Effect.succeed({
					ok: true,
					instrument: {
						id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
						type: "synth",
						name: "Bass",
						params: {},
						createdAt: Date.now(),
					},
				});
			},
		});

		const result = await Effect.runPromise(
			handleCreateInstrument({ type: "synth", name: "Bass" }).pipe(
				Effect.provideService(DawIpcClient, stubIpc),
			),
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.name).toBe("daw.instrument.create");
		expect(calls[0]?.payload).toEqual({ type: "synth", name: "Bass" });
		expect(result.ok).toBe(true);
	});

	it("returns ok:false when the IPC response doesn't match the contract schema", async () => {
		const stubIpc = DawIpcClient.of({
			postCommand: () =>
				Effect.succeed({
					ok: true,
					// missing instrument
				}),
		});

		const result = await Effect.runPromise(
			handleCreateInstrument({ type: "synth", name: "Bass" }).pipe(
				Effect.provideService(DawIpcClient, stubIpc),
			),
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBeTypeOf("string");
			expect(result.error.length).toBeGreaterThan(0);
		}
	});
});

