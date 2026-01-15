import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
	CreateCommand,
	CreateResult,
} from "../commands";

describe("contract schemas", () => {
	it("decodes CreateCommand (preset optional)", async () => {
		const decoded = await Effect.runPromise(
			Schema.decodeUnknown(CreateCommand)({
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
				Schema.decodeUnknown(CreateCommand)({ name: "Bass" }),
			),
		).rejects.toBeDefined();
	});

	it("decodes CreateResult success (DateFromNumber conversion)", async () => {
		const now = Date.now();
		const decoded = await Effect.runPromise(
			Schema.decodeUnknown(CreateResult)({
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

