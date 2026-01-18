import { Project, type SSE } from "@daw/contract";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import { Effect, Schema } from "effect";
import { createSSEClient } from "../utils/sse";

export interface DawStateClientOptions {
	host?: string;
	port?: number;
	baseUrl?: string;
	token?: string;
}

export interface DawStateClient {
	getHealth: () => Promise<{ healthy: boolean; version: string }>;
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
	connectSSE: (options: {
		fromVersion: number;
		onEvent: (event: SSE.SSEEvent) => void;
		onError?: (error: Error) => void;
		onClose?: () => void;
	}) => () => void;
}

/**
 * Health check response schema
 */
const HealthResponse = Schema.Struct({
	healthy: Schema.Boolean,
	version: Schema.String,
});

const decodeOpEntry = Schema.decodeUnknownSync(Project.OpEntry);

const defaultPort = Number.parseInt(
	import.meta.env.VITE_DAW_STATE_PORT ?? "43125",
	10,
);

const resolveBaseUrl = (options?: DawStateClientOptions) => {
	if (options?.baseUrl) return options.baseUrl;
	const host = options?.host ?? "127.0.0.1";
	const port = options?.port ?? defaultPort;
	return `http://${host}:${port}`;
};

const makeAuthHeaders = (
	token?: string,
): Record<string, string> | undefined => {
	if (!token) return undefined;
	return { authorization: `Bearer ${token}` };
};

export const createDawStateClient = (
	options?: DawStateClientOptions,
): DawStateClient => {
	const baseUrl = resolveBaseUrl(options);
	const token = options?.token;
	const authHeaders = makeAuthHeaders(token);

	const runEffect = <A, E>(
		effect: Effect.Effect<A, E, HttpClient.HttpClient>,
	) => Effect.runPromise(Effect.provide(effect, FetchHttpClient.layer));

	return {
		getHealth: () =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const response = yield* client.get(`${baseUrl}/health`, {
						headers: authHeaders,
					});
					return yield* HttpClientResponse.schemaBodyJson(HealthResponse)(
						response,
					);
				}),
			),

		getSnapshot: () =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const response = yield* client.get(`${baseUrl}/snapshot`, {
						headers: authHeaders,
					});
					return yield* HttpClientResponse.schemaBodyJson(Project.Snapshot)(
						response,
					);
				}),
			),

		submitOp: (submit) =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const encodeBody = Schema.encodeSync(Project.Submit);
					const request = HttpClientRequest.post(`${baseUrl}/submitOp`).pipe(
						HttpClientRequest.setHeaders({
							...authHeaders,
						}),
						HttpClientRequest.bodyUnsafeJson(encodeBody(submit)),
					);
					const response = yield* client.execute(request);
					return yield* HttpClientResponse.schemaBodyJson(Project.SubmitResult)(
						response,
					);
				}),
			),

		getOps: (fromVersion) =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const response = yield* client.get(
						`${baseUrl}/ops?fromVersion=${encodeURIComponent(String(fromVersion))}`,
						{ headers: authHeaders },
					);
					return yield* HttpClientResponse.schemaBodyJson(Project.OpsResponse)(
						response,
					);
				}),
			),

		connectOps: ({
			fromVersion,
			clientId,
			onOp,
			onPresence,
			onLocks,
			onError,
			onClose,
		}) => {
			const url = new URL(
				`${baseUrl.replace("http", "ws")}/ws?fromVersion=${encodeURIComponent(
					String(fromVersion),
				)}`,
			);
			if (token) {
				url.searchParams.set("token", token);
			}
			const wsUrl = url.toString();
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

		connectSSE: ({ fromVersion, onEvent, onError, onClose }) => {
			return createSSEClient({
				baseUrl,
				token,
				fromVersion,
				onEvent,
				onError,
				onClose,
			});
		},
	};
};
