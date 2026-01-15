import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { FetchHttpClient } from "@effect/platform";
import { Chunk, Effect, Fiber, Layer, Stream } from "effect";
import { Project } from "@daw/contract";
import { ProjectRpcs } from "@server/rpc/requests";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const serverRoot = new URL("..", import.meta.url).pathname;

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
			const res = await fetch(`${baseUrl}/snapshot`);
			if (res.ok) return;
		} catch {
			// ignore until ready
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error("Timed out waiting for server to start");
};

const makeClientLayer = (baseUrl: string) =>
	RpcClient.layerProtocolHttp({ url: `${baseUrl}/rpc` }).pipe(
		Layer.provide([
			FetchHttpClient.layer,
			RpcSerialization.layerNdjson,
		]),
	);

describe("RPC e2e", () => {
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

	it("GetSnapshot returns initial state", async () => {
		const program = Effect.gen(function* () {
			const client = yield* RpcClient.make(ProjectRpcs);
			return yield* client.GetSnapshot();
		}).pipe(Effect.scoped, Effect.provide(makeClientLayer(baseUrl)));

		const snapshot = await Effect.runPromise(program);
		expect(snapshot.version).toBe(0);
		expect(snapshot.doc.instruments).toHaveLength(0);
	}, 20000);

	it("SubmitOp creates instruments", async () => {
		const program = Effect.gen(function* () {
			const client = yield* RpcClient.make(ProjectRpcs);
			const snapshot = yield* client.GetSnapshot();
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
			return yield* client.SubmitOp(submit);
		}).pipe(Effect.scoped, Effect.provide(makeClientLayer(baseUrl)));

		const result = await Effect.runPromise(program);
		expect(result.version).toBe(1);
		expect(result.patches.patches[0]?.t).toBe("instrument.add");
	}, 20000);

	it("PatchStream streams new patches", async () => {
		const program = Effect.gen(function* () {
			const client = yield* RpcClient.make(ProjectRpcs);
			const snapshot = yield* client.GetSnapshot();
			const stream = client.PatchStream({ fromVersion: snapshot.version });
			const fiber = yield* Stream.take(stream, 1).pipe(Stream.runCollect, Effect.fork);
			yield* Effect.yieldNow();
			yield* client.SubmitOp({
				opId: "e2e-op-2",
				baseVersion: snapshot.version,
				actor: "ui",
				op: {
					t: "instrument.create",
					type: "drum",
					name: "E2E Kit",
				},
			});
			return yield* Fiber.join(fiber);
	}).pipe(Effect.scoped, Effect.provide(makeClientLayer(baseUrl)));

		const patchesChunk = await Effect.runPromise(program);
		const patches = Chunk.toArray(patchesChunk);
		expect(patches[0]?.patches[0]?.t).toBe("instrument.add");
	}, 20000);

	it("AudioDeltaStream streams audio deltas", async () => {
		const program = Effect.gen(function* () {
			const client = yield* RpcClient.make(ProjectRpcs);
			const snapshot = yield* client.GetSnapshot();
			const stream = client.AudioDeltaStream({ fromVersion: snapshot.version });
			const fiber = yield* Stream.take(stream, 1).pipe(Stream.runCollect, Effect.fork);
			yield* Effect.yieldNow();
			yield* client.SubmitOp({
				opId: "e2e-op-3",
				baseVersion: snapshot.version,
				actor: "ui",
				op: {
					t: "instrument.create",
					type: "sampler",
					name: "E2E Sampler",
				},
			});
			return yield* Fiber.join(fiber);
	}).pipe(Effect.scoped, Effect.provide(makeClientLayer(baseUrl)));

		const deltasChunk = await Effect.runPromise(program);
		const deltas = Chunk.toArray(deltasChunk);
		expect(deltas[0]?.version).toBeGreaterThan(0);
	}, 20000);
});
