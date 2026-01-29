import { afterEach, describe, expect, it } from "bun:test";
import type { ProjectCreateCommand } from "@daw/core/commands/command";
import type { EditorCommand } from "@daw/core/commands/editor-ops";
import type * as Project from "@daw/core/domain/project";
import * as Ids from "@daw/core/ids";
import * as Versions from "@daw/core/versions";
import { HttpApiBuilder, HttpServer } from "@effect/platform";
import * as SqlClient from "@effect/sql/SqlClient";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import { ServerConfigTest } from "../config";
import { ProjectCommandHandler } from "../projects/command-handler";
import { ProjectEventBus } from "../projects/event-bus";
import { ProjectEventStore } from "../projects/event-store";
import { ProjectLister } from "../projects/lister";
import { ProjectSnapshotStore } from "../projects/snapshot-store";
import { ProjectStore } from "../projects/store";
import { ApiLive } from "./server";

const TEST_TOKEN = "test-token-123";

const SetupLayer = Layer.effectDiscard(
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		yield* sql`
			CREATE TABLE IF NOT EXISTS snapshots (
				id TEXT NOT NULL,
				name TEXT NOT NULL,
				version INTEGER NOT NULL,
				data TEXT NOT NULL,
				createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (id, version)
			)
		`;
		yield* sql`
			CREATE TABLE IF NOT EXISTS events (
				id TEXT NOT NULL,
				version INTEGER NOT NULL,
				data TEXT NOT NULL,
				createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (id, version)
			)
		`;
	}),
);

const makeLayer = () => {
	const sqlLayer = SqliteClient.layer({ filename: ":memory:" });
	const configLayer = ServerConfigTest({ authToken: TEST_TOKEN });

	const projectLayers = Layer.mergeAll(
		ProjectSnapshotStore.Default,
		ProjectEventStore.Default,
		ProjectEventBus.Default,
	).pipe(
		Layer.provideMerge(ProjectStore.Default),
		Layer.provideMerge(ProjectCommandHandler.Default),
		Layer.provideMerge(ProjectLister.Default),
		Layer.provide(SetupLayer),
		Layer.provide(sqlLayer),
	);

	const apiWithDeps = ApiLive.pipe(
		Layer.provide(projectLayers),
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

	it("serves health check", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const res = await handler(new Request("http://localhost/api/health"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { healthy: boolean; version: string };
		expect(body.healthy).toBe(true);
		expect(body.version).toBeDefined();
	});

	it("returns 401 Unauthorized without token", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const res = await handler(new Request("http://localhost/api/projects"));
		expect(res.status).toBe(401);
	});

	it("returns empty list for listProjects", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const res = await handler(
			new Request("http://localhost/api/projects", {
				headers: { Authorization: `Bearer ${TEST_TOKEN}` },
			}),
		);
		expect(res.status).toBe(200);
		const projects = (await res.json()) as Project.ProjectSummary[];
		expect(Array.isArray(projects)).toBe(true);
		expect(projects.length).toBe(0);
	});

	it("subscribe endpoint returns project.subscribed event", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const projectId = Ids.generate("ProjectId");
		const createCommand: ProjectCreateCommand = {
			id: Ids.generate("CommandId"),
			expectedVersion: Versions.ProjectVersion.make(0),
			actor: "ui",
			payload: {
				t: "project.create",
				projectId,
				name: "Test Project",
			},
		};

		await handler(
			new Request("http://localhost/api/projects", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					Authorization: `Bearer ${TEST_TOKEN}`,
				},
				body: JSON.stringify(createCommand),
			}),
		);

		const res = await handler(
			new Request(
				`http://localhost/api/projects/${projectId}/subscribe?fromVersion=0`,
				{
					headers: { Authorization: `Bearer ${TEST_TOKEN}` },
				},
			),
		);

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/event-stream");

		const reader = res.body?.getReader();
		expect(reader).toBeDefined();
		if (!reader) throw new Error("Reader is null");

		const { value, done } = await reader.read();
		expect(done).toBe(false);
		const text = new TextDecoder().decode(value);
		expect(text).toContain("project.subscribed");
		await reader.cancel();
	});

	it("subscribe endpoint streams edit events", async () => {
		const webHandler = HttpApiBuilder.toWebHandler(makeLayer());
		dispose = webHandler.dispose;
		const { handler } = webHandler;

		const projectId = Ids.generate("ProjectId");
		const createCommand: ProjectCreateCommand = {
			id: Ids.generate("CommandId"),
			expectedVersion: Versions.ProjectVersion.make(0),
			actor: "ui",
			payload: {
				t: "project.create",
				projectId,
				name: "Test Project",
			},
		};

		await handler(
			new Request("http://localhost/api/projects", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					Authorization: `Bearer ${TEST_TOKEN}`,
				},
				body: JSON.stringify(createCommand),
			}),
		);

		const subscribeRes = await handler(
			new Request(
				`http://localhost/api/projects/${projectId}/subscribe?fromVersion=0`,
				{
					headers: { Authorization: `Bearer ${TEST_TOKEN}` },
				},
			),
		);

		const reader = subscribeRes.body?.getReader();
		if (!reader) throw new Error("Reader is null");

		await reader.read();

		const editCommand: EditorCommand = {
			id: Ids.generate("CommandId"),
			expectedVersion: Versions.ProjectVersion.make(0),
			actor: "ui",
			payload: {
				t: "project.rename",
				name: "Renamed Project",
			},
		};

		const editPromise = handler(
			new Request(`http://localhost/api/projects/${projectId}/edit`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					Authorization: `Bearer ${TEST_TOKEN}`,
				},
				body: JSON.stringify(editCommand),
			}),
		);

		const readPromise = reader.read();

		const [editRes, { value }] = await Promise.all([editPromise, readPromise]);
		expect(editRes.status).toBe(200);

		const text = new TextDecoder().decode(value);
		expect(text).toContain("events");
		expect(text).toContain("project.renamed");

		await reader.cancel();
	});
});
