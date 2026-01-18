#!/usr/bin/env bun

const port = Number(process.env.DAW_STATE_PORT ?? "43125");
const baseUrl = process.env.DAW_STATE_URL ?? `http://127.0.0.1:${port}`;
const token = process.env.DAW_STATE_TOKEN ?? "";
const resolveWsBaseUrl = () => {
	if (process.env.DAW_STATE_WS_URL) return process.env.DAW_STATE_WS_URL;
	const url = new URL(baseUrl);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	url.pathname = "";
	url.search = "";
	url.hash = "";
	return url.toString().replace(/\/$/, "");
};
const wsBaseUrl = resolveWsBaseUrl();
const authHeaders = token ? { authorization: `Bearer ${token}` } : {};

const waitForSnapshot = async () => {
	for (let attempt = 0; attempt < 25; attempt += 1) {
		try {
			const res = await fetch(`${baseUrl}/snapshot`);
			if (res.ok) {
				return (await res.json()) as { version: number };
			}
		} catch {
			// ignore while server boots
		}
		await Bun.sleep(200);
	}
	throw new Error("State server did not become ready");
};

const submitCreateInstrument = async (baseVersion: number) => {
	const now = Date.now();
	const submit = {
		opId: crypto.randomUUID(),
		baseVersion,
		actor: "ui",
		op: {
			t: "instrument.create",
			type: "synth",
			name: `Verify ${new Date(now).toISOString()}`,
			instrumentId: crypto.randomUUID(),
			createdAt: now,
		},
	};
	const res = await fetch(`${baseUrl}/submitOp`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(submit),
	});
	if (!res.ok) {
		throw new Error(`submitOp failed: ${res.status}`);
	}
	return res.json();
};

type OpEntry = {
	version: number;
	submit: {
		opId: string;
		baseVersion: number;
		actor: "ui" | "agent";
		op: {
			t: "instrument.create";
			type: "synth" | "sampler" | "drum";
			name: string;
			preset?: string;
			instrumentId?: string;
			createdAt?: number;
		};
	};
};

const waitForWsOp = async (fromVersion: number) => {
	const originUrl = new URL(baseUrl);
	const defaultWsUrl = new URL("/ws", originUrl);
	defaultWsUrl.protocol = defaultWsUrl.protocol === "https:" ? "wss:" : "ws:";
	defaultWsUrl.searchParams.set("fromVersion", String(fromVersion));

	const fallbackWsUrl = new URL(defaultWsUrl.toString());
	if (fallbackWsUrl.hostname === "127.0.0.1") {
		fallbackWsUrl.hostname = "localhost";
	}

	const wsUrls = [
		`${wsBaseUrl}/ws?fromVersion=${encodeURIComponent(String(fromVersion))}`,
		defaultWsUrl.toString(),
		fallbackWsUrl.toString(),
	].filter((value, index, list) => list.indexOf(value) === index);

	let lastError: Error | null = null;
	for (const wsUrl of wsUrls) {
		try {
			return await waitForWsOpAtUrl(wsUrl, fromVersion);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.warn(`[ws] failed to connect to ${wsUrl}: ${lastError.message}`);
		}
	}
	throw lastError ?? new Error("WebSocket failed");
};

const waitForWsOpAtUrl = async (wsUrl: string, fromVersion: number) => {
	const deadline = Date.now() + 8000;
	const { ready, waitForOp, close } = openWs(wsUrl, fromVersion, deadline);
	await ready;
	await submitCreateInstrument(fromVersion);
	try {
		return await waitForOp;
	} finally {
		close();
	}
};

const openWs = (
	wsUrl: string,
	fromVersion: number,
	deadline: number,
): {
	ready: Promise<void>;
	waitForOp: Promise<OpEntry>;
	close: () => void;
} => {
	let socket: WebSocket | null = new WebSocket(wsUrl);
	const close = () => {
		socket?.close();
		socket = null;
	};
	const timer = setInterval(() => {
		if (Date.now() > deadline) {
			clearInterval(timer);
			close();
		}
	}, 250);

	const ready = new Promise<void>((resolve, reject) => {
		socket?.addEventListener("open", () => {
			socket?.send(
				JSON.stringify({
					t: "hello",
					clientId: crypto.randomUUID(),
					lastSeq: fromVersion,
				}),
			);
			resolve();
		});
		socket?.addEventListener("error", () =>
			reject(new Error("WebSocket error")),
		);
	});

	const waitForOp = new Promise<OpEntry>((resolve, reject) => {
		socket?.addEventListener("message", (event) => {
			let payload: { t?: string } & Record<string, unknown>;
			try {
				payload = JSON.parse(String(event.data)) as typeof payload;
			} catch {
				return;
			}
			if (payload.t === "op" && payload.entry) {
				clearInterval(timer);
				resolve(payload.entry as OpEntry);
			}
		});

		socket?.addEventListener("error", () => {
			clearInterval(timer);
			reject(new Error("WebSocket error"));
		});

		socket?.addEventListener("close", (event) => {
			if (Date.now() <= deadline) {
				clearInterval(timer);
				reject(
					new Error(
						`WebSocket closed early (${event.code}) ${event.reason ?? ""}`,
					),
				);
			}
		});
	});
	return { ready, waitForOp, close };
};

// SSE Event types
type SSEEvent =
	| { t: "server.connected"; serverVersion: number }
	| { t: "server.heartbeat"; timestamp: number }
	| { t: "op"; entry: OpEntry }
	| { t: "patch"; batch: { version: number; patches: unknown[] } }
	| { t: "presence"; clients: string[] }
	| { t: "locks"; locks: unknown[] };

// Configuration for SSE tests
const SSE_OP_COUNT = Number(process.env.SSE_OP_COUNT ?? "3");
const SSE_WAIT_HEARTBEAT = process.env.SSE_WAIT_HEARTBEAT === "true";
const SSE_HEARTBEAT_TIMEOUT_MS = 35000; // Heartbeat is every 30s

type SseTestResult = {
	connected: { t: "server.connected"; serverVersion: number } | null;
	heartbeats: Array<{ t: "server.heartbeat"; timestamp: number }>;
	ops: OpEntry[];
	patches: Array<{ version: number; patches: unknown[] }>;
	allEvents: SSEEvent[];
	durationMs: number;
};

const createSseStream = (fromVersion: number) => {
	const url = new URL(`${baseUrl}/event`);
	url.searchParams.set("fromVersion", String(fromVersion));
	if (token) {
		url.searchParams.set("token", token);
	}

	const controller = new AbortController();
	let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
	let buffer = "";
	const decoder = new TextDecoder();

	const connect = async () => {
		const res = await fetch(url.toString(), {
			headers: { ...authHeaders, accept: "text/event-stream" },
			signal: controller.signal,
		});

		if (!res.ok) {
			throw new Error(`SSE connection failed: ${res.status}`);
		}

		const contentType = res.headers.get("content-type");
		if (!contentType?.includes("text/event-stream")) {
			throw new Error(`Unexpected content-type: ${contentType}`);
		}

		reader = res.body?.getReader() ?? null;
		if (!reader) {
			throw new Error("No response body");
		}
	};

	const readEvents = async function* (): AsyncGenerator<SSEEvent> {
		if (!reader) {
			throw new Error("Not connected");
		}

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				if (line.startsWith("data: ")) {
					const data = line.slice(6);
					try {
						const event = JSON.parse(data) as SSEEvent;
						yield event;
					} catch {
						// Ignore parse errors
					}
				}
			}
		}
	};

	const close = async () => {
		controller.abort();
		if (reader) {
			try {
				await reader.cancel();
			} catch {
				// Ignore cancel errors
			}
		}
	};

	return { connect, readEvents, close, controller };
};

const verifySseOverTime = async (
	fromVersion: number,
	options: {
		opCount: number;
		waitForHeartbeat: boolean;
	},
): Promise<SseTestResult> => {
	const startTime = Date.now();
	const result: SseTestResult = {
		connected: null,
		heartbeats: [],
		ops: [],
		patches: [],
		allEvents: [],
		durationMs: 0,
	};

	const stream = createSseStream(fromVersion);
	const timeoutMs = options.waitForHeartbeat ? SSE_HEARTBEAT_TIMEOUT_MS : 15000;
	const timeout = setTimeout(() => stream.controller.abort(), timeoutMs);

	try {
		await stream.connect();
		console.log("[sse] connected, waiting for events...");

		let currentVersion = fromVersion;
		let opsSubmitted = 0;
		let opsReceived = 0;
		const opSubmitInterval = setInterval(async () => {
			if (opsSubmitted < options.opCount) {
				opsSubmitted++;
				console.log(`[sse] submitting op ${opsSubmitted}/${options.opCount}`);
				await submitCreateInstrument(currentVersion);
			}
		}, 500);

		for await (const event of stream.readEvents()) {
			result.allEvents.push(event);

			switch (event.t) {
				case "server.connected":
					result.connected = event;
					currentVersion = event.serverVersion;
					console.log(
						`[sse] received server.connected (version=${event.serverVersion})`,
					);
					break;

				case "server.heartbeat":
					result.heartbeats.push(event);
					console.log(
						`[sse] received heartbeat (timestamp=${event.timestamp})`,
					);
					break;

				case "op":
					if (event.entry.version > fromVersion) {
						result.ops.push(event.entry);
						currentVersion = Math.max(currentVersion, event.entry.version);
						opsReceived++;
						console.log(
							`[sse] received op ${opsReceived}/${options.opCount} (version=${event.entry.version})`,
						);
					}
					break;

				case "patch":
					result.patches.push(event.batch);
					console.log(
						`[sse] received patch (version=${event.batch.version}, patches=${event.batch.patches.length})`,
					);
					break;
			}

			// Check if we have all required events
			const hasConnected = result.connected !== null;
			const hasEnoughOps = result.ops.length >= options.opCount;
			const hasHeartbeat =
				!options.waitForHeartbeat || result.heartbeats.length > 0;

			if (hasConnected && hasEnoughOps && hasHeartbeat) {
				clearInterval(opSubmitInterval);
				break;
			}
		}

		clearInterval(opSubmitInterval);
	} finally {
		clearTimeout(timeout);
		await stream.close();
		result.durationMs = Date.now() - startTime;
	}

	return result;
};

const verifySseResults = (result: SseTestResult, opCount: number) => {
	const errors: string[] = [];

	if (!result.connected) {
		errors.push("Did not receive server.connected event");
	}

	if (result.ops.length < opCount) {
		errors.push(
			`Expected at least ${opCount} ops, received ${result.ops.length}`,
		);
	}

	// Verify ops are in order
	for (let i = 1; i < result.ops.length; i++) {
		if (result.ops[i].version <= result.ops[i - 1].version) {
			errors.push(
				`Ops out of order: version ${result.ops[i].version} <= ${result.ops[i - 1].version}`,
			);
		}
	}

	// Verify patches match ops (each op should produce a patch)
	const opVersions = new Set(result.ops.map((op) => op.version));
	const patchVersions = new Set(result.patches.map((p) => p.version));
	for (const version of opVersions) {
		if (!patchVersions.has(version)) {
			errors.push(`Missing patch for op version ${version}`);
		}
	}

	if (errors.length > 0) {
		throw new Error(`SSE verification failed:\n  - ${errors.join("\n  - ")}`);
	}
};

const run = async () => {
	const snapshot = await waitForSnapshot();
	console.log(`[snapshot] version=${snapshot.version}`);

	// Verify WebSocket
	const wsEntry = await waitForWsOp(snapshot.version);
	console.log("[ok] received ws op:", wsEntry);

	// Verify SSE events over time
	console.log(
		`\n[sse] starting SSE verification (opCount=${SSE_OP_COUNT}, waitForHeartbeat=${SSE_WAIT_HEARTBEAT})`,
	);
	const currentVersion = wsEntry.version;
	const sseResult = await verifySseOverTime(currentVersion, {
		opCount: SSE_OP_COUNT,
		waitForHeartbeat: SSE_WAIT_HEARTBEAT,
	});

	// Verify results
	verifySseResults(sseResult, SSE_OP_COUNT);

	// Print summary
	console.log("\n[sse] verification complete:");
	console.log(`  - connected: ${sseResult.connected ? "yes" : "no"}`);
	console.log(`  - ops received: ${sseResult.ops.length}`);
	console.log(`  - patches received: ${sseResult.patches.length}`);
	console.log(`  - heartbeats received: ${sseResult.heartbeats.length}`);
	console.log(`  - total events: ${sseResult.allEvents.length}`);
	console.log(`  - duration: ${sseResult.durationMs}ms`);

	if (SSE_WAIT_HEARTBEAT && sseResult.heartbeats.length === 0) {
		throw new Error("Expected heartbeat but none received");
	}

	console.log("\n[ok] all SSE verifications passed");
};

run().catch((error) => {
	console.error("verify-server failed:", error);
	process.exitCode = 1;
});
