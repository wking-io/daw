import { describe, expect, it } from "bun:test";
import type { Project } from "@daw/contract";
import { HttpApp, HttpRouter, HttpServer } from "@effect/platform";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { ServerConfigTest } from "../config";
import { PersistenceLive } from "../persist/sqlite";
import { DawStoreLive } from "../store/store";
import { RpcHttpRoutesLive } from "./server";

const makeLayer = () => {
	const sqlLayer = SqliteClient.layer({ filename: ":memory:" });
	const persistenceLayer = PersistenceLive.pipe(Layer.provide(sqlLayer));
	const storeLayer = DawStoreLive.pipe(Layer.provide(persistenceLayer));
	const configLayer = ServerConfigTest();
	const routesLayer = RpcHttpRoutesLive.pipe(
		Layer.provide(storeLayer),
		Layer.provide(configLayer),
	);
	return Layer.mergeAll(
		HttpRouter.Default.Live,
		routesLayer,
		HttpServer.layerContext,
	);
};

const app = HttpRouter.Default.router.pipe(
	Effect.flatMap(HttpRouter.toHttpApp),
	Effect.flatten,
);

describe("RpcHttpRoutes", () => {
	it("serves snapshot and submitOp", async () => {
		const { handler } = HttpApp.toWebHandlerLayer(app, makeLayer());

		const snapshotRes = await handler(new Request("http://localhost/snapshot"));
		const snapshot = (await snapshotRes.json()) as Project.Snapshot;
		expect(snapshot.version).toBe(0);

		const submit: Project.Submit = {
			opId: "op-1",
			baseVersion: snapshot.version,
			actor: "ui",
			op: {
				t: "instrument.create",
				type: "sampler",
				name: "Chops",
			},
		};

		const submitRes = await handler(
			new Request("http://localhost/submitOp", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(submit),
			}),
		);
		const submitResult = (await submitRes.json()) as Project.SubmitResult;
		expect(submitResult.version).toBe(1);
		expect(submitResult.patches.patches[0]?.t).toBe("instrument.add");
	});
});
