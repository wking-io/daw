import { describe, expect, it } from "bun:test";
import type { Project, SSE } from "@daw/contract";
import { HttpApp, HttpRouter, HttpServer } from "@effect/platform";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { ServerConfigTest } from "../config";
import { PersistenceLive } from "../persist/sqlite";
import { DawStoreLive } from "../store/store";
import { HttpRoutesLive } from "./server";

const makeLayer = () => {
	const sqlLayer = SqliteClient.layer({ filename: ":memory:" });
	const persistenceLayer = PersistenceLive.pipe(Layer.provide(sqlLayer));
	const storeLayer = DawStoreLive.pipe(Layer.provide(persistenceLayer));
	const configLayer = ServerConfigTest();
	const routesLayer = HttpRoutesLive.pipe(
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

	it("serves health check", async () => {
		const { handler } = HttpApp.toWebHandlerLayer(app, makeLayer());

		const res = await handler(new Request("http://localhost/health"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { healthy: boolean; version: string };
		expect(body.healthy).toBe(true);
		expect(body.version).toBeDefined();
	});

	it("serves SSE event stream with server.connected event", async () => {
		const { handler } = HttpApp.toWebHandlerLayer(app, makeLayer());

		const res = await handler(
			new Request("http://localhost/event?fromVersion=0"),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/event-stream");

		const reader = res.body?.getReader();
		expect(reader).toBeDefined();

		// Read the first chunk which should contain the connected event
		const { value, done } = await reader!.read();
		expect(done).toBe(false);

		const text = new TextDecoder().decode(value);
		expect(text).toContain("data:");

		// Parse the SSE data
		const dataLine = text.split("\n").find((line) => line.startsWith("data:"));
		expect(dataLine).toBeDefined();

		const eventData = JSON.parse(dataLine!.slice(6)) as SSE.SSEEvent;
		expect(eventData.t).toBe("server.connected");
		if (eventData.t === "server.connected") {
			expect(eventData.serverVersion).toBe(0);
		}

		// Cancel the stream
		await reader!.cancel();
	});
});
