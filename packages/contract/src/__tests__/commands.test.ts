import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
	CreateInstrumentCommand,
	CreateInstrumentResult,
} from "../commands";

describe("contract schemas", () => {
	it("decodes CreateInstrumentCommand (preset optional)", async () => {
		const decoded = await Effect.runPromise(
			Schema.decodeUnknown(CreateInstrumentCommand)({
				type: "synth",
				name: "Bass",
			}),
		);

		expect(decoded).toEqual({
			type: "synth",
			name: "Bass",
		});
	});

	it("rejects CreateInstrumentCommand when required fields are missing", async () => {
		await expect(
			Effect.runPromise(
				// missing `type`
				Schema.decodeUnknown(CreateInstrumentCommand)({ name: "Bass" }),
			),
		).rejects.toBeDefined();
	});

	it("decodes CreateInstrumentResult success (DateFromNumber conversion)", async () => {
		const now = Date.now();
		const decoded = await Effect.runPromise(
			Schema.decodeUnknown(CreateInstrumentResult)({
				ok: true,
				instrument: {
					id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
					type: "synth",
					name: "Bass",
					params: {},
					createdAt: now,
				},
			}),
		);

		expect(decoded.ok).toBe(true);
		if (decoded.ok) {
			expect(decoded.instrument.createdAt).toBeInstanceOf(Date);
			expect(decoded.instrument.createdAt.getTime()).toBe(now);
		}
	});
});

