import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Project } from "@daw/contract";
import { Schema } from "effect";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const serverRoot = new URL("..", import.meta.url).pathname;

const decodeSnapshot = Schema.decodeUnknownSync(Project.Snapshot);
const decodeSubmitResult = Schema.decodeUnknownSync(Project.SubmitResult);

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
			const res = await fetch(`${baseUrl}/api/project/snapshot`);
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

	beforeAll(async () => {
		dbDir = await mkdtemp(join(tmpdir(), "daw-server-"));
		const port = 43125 + Math.floor(Math.random() * 1000);
		baseUrl = `http://127.0.0.1:${port}`;

		child = Bun.spawn(["bun", "run", "src/index.ts"], {
			cwd: serverRoot,
			env: {
				...process.env,
				DAW_STATE_PORT: String(port),
				DAW_STATE_DB: join(dbDir, "state.db"),
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

	it("GET /api/project/snapshot returns initial state", async () => {
		const res = await fetch(`${baseUrl}/api/project/snapshot`);
		expect(res.ok).toBe(true);
		const json = await res.json();
		const snapshot = decodeSnapshot(json);
		expect(snapshot.version).toBe(0);
		expect(snapshot.doc.instruments).toHaveLength(0);
	}, 20000);

	it("POST /api/project/operations creates instruments", async () => {
		const snapshotRes = await fetch(`${baseUrl}/api/project/snapshot`);
		const snapshot = decodeSnapshot(await snapshotRes.json());

		const submit: Project.Submit = {
			opId: "e2e-op-1",
			baseVersion: snapshot.version,
			actor: "ui",
			op: {
				t: "instrument.create",
				type: "synth",
				name: "E2E Lead",
			},
		};

		const res = await fetch(`${baseUrl}/api/project/operations`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(submit),
		});
		expect(res.ok).toBe(true);
		const result = decodeSubmitResult(await res.json());
		expect(result.version).toBe(1);
		expect(result.patches.patches[0]?.t).toBe("instrument.add");
	}, 20000);

	it("GET /api/project/operations returns ops after version", async () => {
		const res = await fetch(`${baseUrl}/api/project/operations?fromVersion=0`);
		expect(res.ok).toBe(true);
		const json = (await res.json()) as Project.OperationsResponse;
		expect(json.fromVersion).toBe(0);
		expect(Array.isArray(json.operations)).toBe(true);
	}, 20000);

	it("GET /api/health returns healthy status", async () => {
		const res = await fetch(`${baseUrl}/api/health`);
		expect(res.ok).toBe(true);
		const json = (await res.json()) as { healthy: boolean; version: string };
		expect(json.healthy).toBe(true);
		expect(typeof json.version).toBe("string");
	}, 20000);

	it("GET /api/events returns SSE stream", async () => {
		const res = await fetch(`${baseUrl}/api/events?fromVersion=0`);
		expect(res.ok).toBe(true);
		expect(res.headers.get("content-type")).toBe("text/event-stream");

		const reader = res.body?.getReader();
		expect(reader).toBeDefined();

		// Read first chunk (should be server.connected event)
		const { value, done } = await reader!.read();
		expect(done).toBe(false);

		const text = new TextDecoder().decode(value);
		expect(text).toContain("data:");
		expect(text).toContain("server.connected");

		await reader!.cancel();
	}, 20000);
});
