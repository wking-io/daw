#!/usr/bin/env bun

const port = Number(Bun.env.DAW_STATE_PORT ?? "43125");
const baseUrl = Bun.env.DAW_STATE_URL ?? `http://127.0.0.1:${port}`;
const token = Bun.env.DAW_STATE_TOKEN ?? "";
const authHeaders = token ? { authorization: `Bearer ${token}` } : {};

const waitForHealth = async () => {
	for (let attempt = 0; attempt < 25; attempt += 1) {
		try {
			const res = await fetch(`${baseUrl}/api/health`, {
				headers: authHeaders,
			});
			if (res.ok) {
				const json = (await res.json()) as {
					healthy: boolean;
					version: string;
				};
				if (json.healthy) {
					console.log(`[health] version=${json.version}`);
					return json;
				}
			}
		} catch {
			// ignore while server boots
		}
		await Bun.sleep(200);
	}
	throw new Error("State server did not become ready");
};

const getSnapshot = async () => {
	const res = await fetch(`${baseUrl}/api/project/snapshot`, {
		headers: authHeaders,
	});
	if (!res.ok) {
		throw new Error(`snapshot failed: ${res.status}`);
	}
	return (await res.json()) as { version: number };
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
	const res = await fetch(`${baseUrl}/api/project/operations`, {
		method: "POST",
		headers: { "content-type": "application/json", ...authHeaders },
		body: JSON.stringify(submit),
	});
	if (!res.ok) {
		throw new Error(`operations (POST) failed: ${res.status}`);
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

// SSE Event types
type SSEEvent =
	| { t: "server.connected"; serverVersion: number }
	| { t: "server.heartbeat"; timestamp: number }
	| { t: "op"; entry: OpEntry }
	| { t: "operation"; entry: OpEntry }
	| { t: "patch"; batch: { version: number; patches: unknown[] } };

// Configuration for SSE tests
const SSE_OP_COUNT = Number(Bun.env.SSE_OP_COUNT ?? "3");
const SSE_WAIT_HEARTBEAT = Bun.env.SSE_WAIT_HEARTBEAT === "true";
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
	const url = new URL(`${baseUrl}/api/events/subscribe`);
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
				case "operation":
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
	// Verify health endpoint
	await waitForHealth();

	// Verify snapshot endpoint
	const snapshot = await getSnapshot();
	console.log(`[snapshot] version=${snapshot.version}`);

	// Verify SSE events over time
	console.log(
		`\n[sse] starting SSE verification (opCount=${SSE_OP_COUNT}, waitForHeartbeat=${SSE_WAIT_HEARTBEAT})`,
	);
	const sseResult = await verifySseOverTime(snapshot.version, {
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

	console.log("\n[ok] all verifications passed");
};

run().catch((error) => {
	console.error("verify-server failed:", error);
	process.exit(1);
});
