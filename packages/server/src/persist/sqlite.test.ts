import { describe, expect, it } from "bun:test";
import type { Project } from "@daw/contract";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { Persistence, PersistenceLive } from "./sqlite";

const makeLayer = () =>
	PersistenceLive.pipe(
		Layer.provide(SqliteClient.layer({ filename: ":memory:" })),
	);

describe("Persistence", () => {
	it("saves and loads snapshots", async () => {
		const program = Effect.gen(function* () {
			const persistence = yield* Persistence;
			const snapshot: Project.Snapshot = {
				version: 1,
				doc: { instruments: [] },
			};
			yield* persistence.saveSnapshot(snapshot);
			const loaded = yield* persistence.loadLatestSnapshot;
			return loaded;
		});

		const loaded = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		expect(loaded?.version).toBe(1);
		expect(loaded?.doc.instruments).toHaveLength(0);
	});

	it("appends and reads events", async () => {
		const program = Effect.gen(function* () {
			const persistence = yield* Persistence;
			const submit: Project.Submit = {
				opId: "op-1",
				baseVersion: 0,
				actor: "ui",
				op: {
					t: "instrument.create",
					type: "synth",
					name: "Pad",
				},
			};
			yield* persistence.appendEvent({ version: 1, submit });
			return yield* persistence.loadEventsAfter(0);
		});

		const events = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		expect(events).toHaveLength(1);
		expect(events[0]?.submit.op.t).toBe("instrument.create");
	});
});
