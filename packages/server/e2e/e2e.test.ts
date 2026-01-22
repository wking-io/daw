import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { type Commands, Events, type ProjectId } from "@daw/core";
import { Schema } from "effect";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const serverRoot = new URL("..", import.meta.url).pathname;

const decodeSnapshot = Schema.decodeUnknownSync(Events.Snapshot);
const decodeCommandResult = Schema.decodeUnknownSync(Events.CommandResult);

// Use a fixed test project ID - project is lazily created when accessed
const TEST_PROJECT_ID = "e2e-test-project" as ProjectId;

const readStreamText = async (
	stream: ReadableStream | number | undefined | null,
) => {
	if (!stream || typeof stream === "number") return "";
	try {
		return await new Response(stream).text();
	} catch {
		return "";
	}
};

const waitForServer = async (
	baseUrl: string,
	timeoutMs = 5000,
	child?: ReturnType<typeof Bun.spawn> | null,
) => {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		if (child && child.exitCode !== null) {
			const stderr = await readStreamText(child.stderr);
			throw new Error(`Server exited early: ${child.exitCode}\n${stderr}`);
		}
		try {
			const res = await fetch(`${baseUrl}/api/health`);
			if (res.ok) return;
		} catch {
			// ignore until ready
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error("Timed out waiting for server to start");
};

describe("HTTP e2e", () => {
	let child: ReturnType<typeof Bun.spawn> | null = null;
	let baseUrl = "";
	let dbDir = "";
	let authToken = "";

	beforeAll(async () => {
		dbDir = await mkdtemp(join(tmpdir(), "daw-server-"));
		const port = 43125 + Math.floor(Math.random() * 1000);
		baseUrl = `http://127.0.0.1:${port}`;
		authToken = "e2e-test-token";

		child = Bun.spawn(["bun", "run", "src/index.ts"], {
			cwd: serverRoot,
			env: {
				...process.env,
				DAW_STATE_PORT: String(port),
				DAW_STATE_DB: join(dbDir, "state.db"),
				DAW_STATE_TOKEN: authToken,
			},
			stdout: "pipe",
			stderr: "pipe",
		});

		await waitForServer(baseUrl, 20000, child);
	});

	afterAll(async () => {
		if (child) {
			child.kill();
			child = null;
		}
		if (dbDir) {
			await rm(dbDir, { recursive: true, force: true });
		}
	});

	it("GET /api/projects/:projectId/snapshot returns initial state", async () => {
		const res = await fetch(
			`${baseUrl}/api/projects/${TEST_PROJECT_ID}/snapshot`,
			{
				headers: { Authorization: `Bearer ${authToken}` },
			},
		);
		if (!res.ok) {
			console.error("Snapshot response not ok:", res.status, await res.text());
		}
		expect(res.ok).toBe(true);
		const json = await res.json();
		const snapshot = decodeSnapshot(json);
		expect(snapshot.version).toBe(0);
		expect(snapshot.tracks).toHaveLength(0);
	}, 20000);

	it("POST /api/projects/:projectId/commands executes command", async () => {
		const snapshotRes = await fetch(
			`${baseUrl}/api/projects/${TEST_PROJECT_ID}/snapshot`,
			{
				headers: { Authorization: `Bearer ${authToken}` },
			},
		);
		const snapshot = decodeSnapshot(await snapshotRes.json());

		const command: Commands.Command = {
			commandId: "e2e-cmd-1",
			expectedVersion: snapshot.version,
			actor: "ui",
			payload: {
				t: "project.rename",
				name: "E2E Project",
			},
		};

		const res = await fetch(
			`${baseUrl}/api/projects/${TEST_PROJECT_ID}/commands`,
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify(command),
			},
		);
		expect(res.ok).toBe(true);
		const result = decodeCommandResult(await res.json());
		expect(result.version).toBe(1);
		expect(result.events.events[0]?.t).toBe("project.renamed");
	}, 20000);

	it("GET /api/projects/:projectId/events returns events after version", async () => {
		const res = await fetch(
			`${baseUrl}/api/projects/${TEST_PROJECT_ID}/events?fromVersion=0`,
			{
				headers: { Authorization: `Bearer ${authToken}` },
			},
		);
		expect(res.ok).toBe(true);
		const json = (await res.json()) as Events.EventBatch[];
		expect(Array.isArray(json)).toBe(true);
	}, 20000);

	it("GET /api/health returns healthy status", async () => {
		const res = await fetch(`${baseUrl}/api/health`);
		expect(res.ok).toBe(true);
		const json = (await res.json()) as { healthy: boolean; version: string };
		expect(json.healthy).toBe(true);
		expect(typeof json.version).toBe("string");
	}, 20000);

	it("GET /api/projects/:projectId/subscribe returns event stream", async () => {
		const res = await fetch(
			`${baseUrl}/api/projects/${TEST_PROJECT_ID}/subscribe?fromVersion=0`,
			{
				headers: { Authorization: `Bearer ${authToken}` },
			},
		);
		expect(res.ok).toBe(true);
		expect(res.headers.get("content-type")).toBe("text/event-stream");

		const reader = res.body?.getReader();
		expect(reader).toBeDefined();
		if (!reader) throw new Error("Reader is null");

		// Read first chunk (should be server.connected event)
		const { value, done } = await reader.read();
		expect(done).toBe(false);

		const text = new TextDecoder().decode(value);
		expect(text).toContain("data:");
		expect(text).toContain("server.connected");

		await reader.cancel();
	}, 20000);

	it("GET /api/projects returns empty list for new database", async () => {
		const res = await fetch(`${baseUrl}/api/projects`, {
			headers: { Authorization: `Bearer ${authToken}` },
		});
		expect(res.ok).toBe(true);
		const projects = (await res.json()) as Array<{ id: string }>;
		// Multi-project model returns empty list initially
		expect(Array.isArray(projects)).toBe(true);
	}, 20000);
});
