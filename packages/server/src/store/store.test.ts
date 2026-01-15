import { describe, expect, it } from "bun:test";
import type { Project } from "@daw/contract";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Chunk, Effect, Layer, Stream } from "effect";
import { PersistenceLive } from "../persist/sqlite";
import { DawStore, DawStoreLive } from "./store";

const makeLayer = () =>
	DawStoreLive.pipe(
		Layer.provide(
			PersistenceLive.pipe(
				Layer.provide(SqliteClient.layer({ filename: ":memory:" })),
			),
		),
	);

describe("DawStore", () => {
	it("submits ops and updates snapshot", async () => {
		const program = Effect.gen(function* () {
			const store = yield* DawStore;
			const before = yield* store.getSnapshot;
			const submit: Project.Submit = {
				opId: "op-1",
				baseVersion: before.version,
				actor: "ui",
				op: {
					t: "instrument.create",
					type: "synth",
					name: "Lead",
				},
			};
			yield* store.submitOp(submit);
			return yield* store.getSnapshot;
		});

		const snapshot = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		expect(snapshot.version).toBe(1);
		expect(snapshot.doc.instruments).toHaveLength(1);
	});

	it("streams patches from a version", async () => {
		const program = Effect.gen(function* () {
			const store = yield* DawStore;
			const before = yield* store.getSnapshot;
			const submit: Project.Submit = {
				opId: "op-2",
				baseVersion: before.version,
				actor: "ui",
				op: {
					t: "instrument.create",
					type: "drum",
					name: "Kit",
				},
			};
			yield* store.submitOp(submit);
			const stream = yield* store.patchStreamFrom(0);
			return yield* Stream.take(stream, 1).pipe(Stream.runCollect);
		});

		const patchesChunk = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);
		const patches = Chunk.toArray(patchesChunk);
		expect(patches).toHaveLength(1);
		expect(patches[0]?.patches[0]?.t).toBe("instrument.add");
	});
});
