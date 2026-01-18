import { afterEach, describe, expect, it } from "bun:test";
import type { Events, Project } from "@daw/contract";
import { HttpApiBuilder, HttpServer } from "@effect/platform";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Layer } from "effect";
import { ServerConfigTest } from "../config";
import { PersistenceLive } from "../persist/sqlite";
import { DawStoreLive } from "../store/store";
import { ApiLive } from "./server";

const TEST_TOKEN = "test-token-123";

const makeLayer = () => {
	const sqlLayer = SqliteClient.layer({ filename: ":memory:" });
	const persistenceLayer = PersistenceLive.pipe(Layer.provide(sqlLayer));
	const storeLayer = DawStoreLive.pipe(Layer.provide(persistenceLayer));
	const configLayer = ServerConfigTest({ authToken: TEST_TOKEN });

	// ApiLive needs ServerConfig and DawStore
	const apiWithDeps = ApiLive.pipe(
		Layer.provide(storeLayer),
		Layer.provide(configLayer),
	);

	return Layer.mergeAll(apiWithDeps, HttpServer.layerContext);
};

describe("HttpEndpoints", () => {
	let dispose: (() => Promise<void>) | null = null;

	afterEach(async () => {
		if (dispose) {
			await dispose();
			dispose = null;
		}
	});

	it("serves snapshot and postOperations", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const snapshotRes = await handler(
			new Request("http://localhost/api/project/snapshot", {
				headers: { Authorization: `Bearer ${TEST_TOKEN}` },
			}),
		);
		expect(snapshotRes.status).toBe(200);
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
			new Request("http://localhost/api/project/operations", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					Authorization: `Bearer ${TEST_TOKEN}`,
				},
				body: JSON.stringify(submit),
			}),
		);
		expect(submitRes.status).toBe(200);
		const submitResult = (await submitRes.json()) as Project.SubmitResult;
		expect(submitResult.version).toBe(1);
		expect(submitResult.patches.patches[0]?.t).toBe("instrument.add");
	});

	it("serves health check", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		// Health endpoint doesn't require auth
		const res = await handler(new Request("http://localhost/api/health"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { healthy: boolean; version: string };
		expect(body.healthy).toBe(true);
		expect(body.version).toBeDefined();
	});

	it("serves SSE event stream with server.connected event", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const res = await handler(
			new Request("http://localhost/api/events?fromVersion=0", {
				headers: { Authorization: `Bearer ${TEST_TOKEN}` },
			}),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/event-stream");

		const reader = res.body?.getReader();
		expect(reader).toBeDefined();
		if (!reader) throw new Error("Reader is undefined");

		// Read the first chunk which should contain the connected event
		const { value, done } = await reader.read();
		expect(done).toBe(false);

		const text = new TextDecoder().decode(value);
		expect(text).toContain("data:");

		// Parse the SSE data
		const dataLine = text.split("\n").find((line) => line.startsWith("data:"));
		expect(dataLine).toBeDefined();
		if (!dataLine) throw new Error("Data line is undefined");

		const eventData = JSON.parse(dataLine.slice(6)) as Events.Event;
		expect(eventData.t).toBe("server.connected");
		if (eventData.t === "server.connected") {
			expect(eventData.serverVersion).toBe(0);
		}

		// Cancel the stream
		await reader.cancel();
	});

	it("returns 401 Unauthorized without token", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		// Snapshot requires auth
		const res = await handler(
			new Request("http://localhost/api/project/snapshot"),
		);
		expect(res.status).toBe(401);
	});

	it("serves getOperations", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const res = await handler(
			new Request("http://localhost/api/project/operations?fromVersion=0", {
				headers: { Authorization: `Bearer ${TEST_TOKEN}` },
			}),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as Project.OperationsResponse;
		expect(body.fromVersion).toBe(0);
		expect(Array.isArray(body.operations)).toBe(true);
	});
});
