#!/usr/bin/env bun

const port = Number(process.env.DAW_STATE_PORT ?? "43125");
const baseUrl = process.env.DAW_STATE_URL ?? `http://127.0.0.1:${port}`;
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

const run = async () => {
	const snapshot = await waitForSnapshot();
	console.log(`[snapshot] version=${snapshot.version}`);
	const entry = await waitForWsOp(snapshot.version);
	console.log("[ok] received ws op:", entry);
};

run().catch((error) => {
	console.error("verify-server failed:", error);
	process.exitCode = 1;
});
