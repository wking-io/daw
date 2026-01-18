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

/**
 * Create a DAW state client for HTTP + SSE communication.
 *
 * This client provides:
 * - HTTP endpoints for snapshot, submitOp, ops
 * - SSE streaming for real-time updates (replaces WebSocket)
 */
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
