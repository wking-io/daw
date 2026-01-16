import { Project } from "@daw/contract";
import { Schema } from "effect";

export interface DawStateClientOptions {
	host?: string;
	port?: number;
}

export interface DawStateClient {
	getSnapshot: () => Promise<Project.Snapshot>;
	submitOp: (submit: Project.Submit) => Promise<Project.SubmitResult>;
	getOps: (fromVersion: number) => Promise<Project.OpsResponse>;
	connectOps: (options: {
		fromVersion: number;
		clientId: string;
		onOp: (entry: Project.OpEntry) => void;
		onPresence?: (clients: ReadonlyArray<string>) => void;
		onLocks?: (
			locks: ReadonlyArray<{
				resource: string;
				clientId: string;
				acquiredAt: number;
			}>,
		) => void;
		onError?: (error: Event | Error) => void;
		onClose?: () => void;
	}) => () => void;
}

const decodeSnapshot = Schema.decodeUnknownSync(Project.Snapshot);
const decodeSubmitResult = Schema.decodeUnknownSync(Project.SubmitResult);
const decodeOpsResponse = Schema.decodeUnknownSync(Project.OpsResponse);
const decodeOpEntry = Schema.decodeUnknownSync(Project.OpEntry);

const defaultPort = Number.parseInt(
	import.meta.env.VITE_DAW_STATE_PORT ?? "43125",
	10,
);

const resolveBaseUrl = (options?: DawStateClientOptions) => {
	const host = options?.host ?? "127.0.0.1";
	const port = options?.port ?? defaultPort;
	return `http://${host}:${port}`;
};

export const createDawStateClient = (
	options?: DawStateClientOptions,
): DawStateClient => {
	const baseUrl = resolveBaseUrl(options);
	return {
		getSnapshot: async () => {
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/app/src/rpc/client.ts:getSnapshot",
						message: "ui.rpc.getSnapshot.start",
						data: { baseUrl },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H7",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			let res: Response;
			try {
				res = await fetch(`${baseUrl}/snapshot`);
			} catch (error) {
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/app/src/rpc/client.ts:getSnapshot",
							message: "ui.rpc.getSnapshot.fetchError",
							data: { baseUrl, error: String(error) },
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H7",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				throw error;
			}
			if (!res.ok) {
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/app/src/rpc/client.ts:getSnapshot",
							message: "ui.rpc.getSnapshot.httpError",
							data: { baseUrl, status: res.status, statusText: res.statusText },
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H7",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				throw new Error(`snapshot failed: ${res.status} ${res.statusText}`);
			}
			const json = await res.json();
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/app/src/rpc/client.ts:getSnapshot",
						message: "ui.rpc.getSnapshot.success",
						data: { baseUrl },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H7",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			return decodeSnapshot(json);
		},
		submitOp: async (submit) => {
			const res = await fetch(`${baseUrl}/submitOp`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(submit),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(
					text.length > 0 ? text : `submit failed: ${res.status}`,
				);
			}
			const json = await res.json();
			return decodeSubmitResult(json);
		},
		getOps: async (fromVersion) => {
			const res = await fetch(
				`${baseUrl}/ops?fromVersion=${encodeURIComponent(String(fromVersion))}`,
			);
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text.length > 0 ? text : `ops failed: ${res.status}`);
			}
			const json = await res.json();
			return decodeOpsResponse(json);
		},
		connectOps: ({
			fromVersion,
			clientId,
			onOp,
			onPresence,
			onLocks,
			onError,
			onClose,
		}) => {
			const wsUrl = `${baseUrl.replace("http", "ws")}/ws?fromVersion=${encodeURIComponent(
				String(fromVersion),
			)}`;
			let socket: WebSocket | null = new WebSocket(wsUrl);
			const close = () => {
				if (!socket) return;
				if (
					socket.readyState === WebSocket.CONNECTING ||
					socket.readyState === WebSocket.OPEN
				) {
					socket.close();
				}
				socket = null;
			};

			socket.onopen = () => {
				socket?.send(
					JSON.stringify({
						t: "hello",
						clientId,
						lastSeq: fromVersion,
					}),
				);
			};
			socket.onmessage = (event) => {
				let message: { t?: string } & Record<string, unknown>;
				try {
					message = JSON.parse(String(event.data)) as typeof message;
				} catch {
					return;
				}
				if (message.t === "op" && message.entry) {
					onOp(decodeOpEntry(message.entry));
				}
				if (message.t === "presence" && Array.isArray(message.clients)) {
					onPresence?.(message.clients as ReadonlyArray<string>);
				}
				if (message.t === "locks" && Array.isArray(message.locks)) {
					onLocks?.(
						message.locks as ReadonlyArray<{
							resource: string;
							clientId: string;
							acquiredAt: number;
						}>,
					);
				}
			};
			socket.onerror = () => {
				onError?.(new Error("WebSocket error"));
			};
			socket.onclose = () => {
				onClose?.();
			};

			return close;
		},
	};
};
