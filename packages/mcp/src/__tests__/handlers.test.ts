import type { Instrument } from "@daw/contract";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { handleCreateInstrument } from "../instruments/handlers";
import {
	InstrumentNotCreatedError,
	InstrumentRepository,
} from "../instruments/repo";

describe("mcp tool handlers", () => {
	it("submits instrument.create via InstrumentRepository and decodes success", async () => {
		const createCalls: Array<{ type: string; name: string }> = [];

		const stubRepo = InstrumentRepository.of({
			create: (params) => {
				createCalls.push({ type: params.type, name: params.name });
				return Effect.succeed({
					id: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as Instrument.InstrumentId,
					type: params.type,
					name: params.name,
					params: {},
					createdAt: new Date(),
				});
			},
		});

		const result = await Effect.runPromise(
			handleCreateInstrument({ type: "synth", name: "Bass" }).pipe(
				Effect.provideService(InstrumentRepository, stubRepo),
			),
		);

		expect(createCalls).toHaveLength(1);
		expect(createCalls[0]).toEqual({
			type: "synth",
			name: "Bass",
		});
		expect(result.ok).toBe(true);
	});

	it("returns ok:false when repository fails with InstrumentNotCreatedError", async () => {
		const stubRepo = InstrumentRepository.of({
			create: () =>
				Effect.fail(
					new InstrumentNotCreatedError({ message: "No patch returned" }),
				),
		});

		const result = await Effect.runPromise(
			handleCreateInstrument({ type: "synth", name: "Bass" }).pipe(
				Effect.provideService(InstrumentRepository, stubRepo),
			),
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBeTypeOf("string");
			expect(result.error).toContain("No patch returned");
		}
	});
});
