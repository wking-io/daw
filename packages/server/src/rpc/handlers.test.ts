import { describe, expect, it } from "bun:test";
import type { Project } from "@daw/contract";
import { makeClient } from "@effect/rpc/RpcTest";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { PersistenceLive } from "../persist/sqlite";
import { DawStoreLive } from "../store/store";
import { ProjectHandlersLive } from "./handlers";
import { ProjectRpcs } from "./requests";

const makeLayer = () => {
	const sqlLayer = SqliteClient.layer({ filename: ":memory:" });
	const persistenceLayer = PersistenceLive.pipe(Layer.provide(sqlLayer));
	const storeLayer = DawStoreLive.pipe(Layer.provide(persistenceLayer));
	return ProjectHandlersLive.pipe(Layer.provide(storeLayer));
};

describe("ProjectHandlers", () => {
	it("handles snapshot and submit via rpc client", async () => {
		const program = Effect.gen(function* () {
			const client = yield* makeClient(ProjectRpcs);
			const snapshot = yield* client.GetSnapshot();
			const submit: Project.Submit = {
				opId: "rpc-op-1",
				baseVersion: snapshot.version,
				actor: "agent",
				op: {
					t: "instrument.create",
					type: "synth",
					name: "Keys",
				},
			};
			const result = yield* client.SubmitOp(submit);
			return { snapshot, result };
		}).pipe(Effect.scoped);

		const { snapshot, result } = await Effect.runPromise(
			program.pipe(Effect.provide(makeLayer())),
		);

		expect(snapshot.version).toBe(0);
		expect(result.version).toBe(1);
		expect(result.patches.patches[0]?.t).toBe("instrument.add");
	});
});
