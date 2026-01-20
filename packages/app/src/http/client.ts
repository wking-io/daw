import type { Commands, Events, ProjectId, SSE } from "@daw/contract";
import {
	Commands as CommandsSchema,
	Events as EventsSchema,
} from "@daw/contract";
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
	getSnapshot: (projectId: ProjectId) => Promise<Events.Snapshot>;
	executeCommand: (
		projectId: ProjectId,
		command: Commands.Command,
	) => Promise<Events.CommandResult>;
	/** @deprecated Use executeCommand instead */
	submitOp: (
		projectId: ProjectId,
		command: Commands.Command,
	) => Promise<Events.CommandResult>;
	getEvents: (
		projectId: ProjectId,
		fromVersion: number,
	) => Promise<{ fromVersion: number; events: readonly Events.EventBatch[] }>;
	/** @deprecated Use getEvents instead */
	getOps: (
		projectId: ProjectId,
		fromVersion: number,
	) => Promise<{ fromVersion: number; events: readonly Events.EventBatch[] }>;
	connectSSE: (options: {
		projectId: ProjectId;
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
					const response = yield* client.get(`${baseUrl}/api/health`, {
						headers: authHeaders,
					});
					return yield* HttpClientResponse.schemaBodyJson(HealthResponse)(
						response,
					);
				}),
			),

		getSnapshot: (projectId) =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const response = yield* client.get(
						`${baseUrl}/api/projects/${projectId}/snapshot`,
						{
							headers: authHeaders,
						},
					);
					return yield* HttpClientResponse.schemaBodyJson(
						EventsSchema.Snapshot,
					)(response);
				}),
			),

		executeCommand: (projectId, command) =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const encodeBody = Schema.encodeSync(CommandsSchema.Command);
					const request = HttpClientRequest.post(
						`${baseUrl}/api/projects/${projectId}/commands`,
					).pipe(
						HttpClientRequest.setHeaders({
							...authHeaders,
						}),
						HttpClientRequest.bodyUnsafeJson(encodeBody(command)),
					);
					const response = yield* client.execute(request);
					return yield* HttpClientResponse.schemaBodyJson(
						EventsSchema.CommandResult,
					)(response);
				}),
			),

		submitOp: (projectId, command) =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const encodeBody = Schema.encodeSync(CommandsSchema.Command);
					const request = HttpClientRequest.post(
						`${baseUrl}/api/projects/${projectId}/commands`,
					).pipe(
						HttpClientRequest.setHeaders({
							...authHeaders,
						}),
						HttpClientRequest.bodyUnsafeJson(encodeBody(command)),
					);
					const response = yield* client.execute(request);
					return yield* HttpClientResponse.schemaBodyJson(
						EventsSchema.CommandResult,
					)(response);
				}),
			),

		getEvents: (projectId, fromVersion) =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const response = yield* client.get(
						`${baseUrl}/api/projects/${projectId}/events?fromVersion=${encodeURIComponent(String(fromVersion))}`,
						{ headers: authHeaders },
					);
					return yield* HttpClientResponse.schemaBodyJson(
						Schema.Struct({
							fromVersion: Schema.Number,
							events: Schema.Array(EventsSchema.EventBatch),
						}),
					)(response);
				}),
			),

		getOps: (projectId, fromVersion) =>
			runEffect(
				Effect.gen(function* () {
					const client = yield* HttpClient.HttpClient;
					const response = yield* client.get(
						`${baseUrl}/api/projects/${projectId}/events?fromVersion=${encodeURIComponent(String(fromVersion))}`,
						{ headers: authHeaders },
					);
					return yield* HttpClientResponse.schemaBodyJson(
						Schema.Struct({
							fromVersion: Schema.Number,
							events: Schema.Array(EventsSchema.EventBatch),
						}),
					)(response);
				}),
			),

		connectSSE: ({ projectId, fromVersion, onEvent, onError, onClose }) => {
			return createSSEClient({
				baseUrl,
				token,
				projectId,
				fromVersion,
				onEvent,
				onError,
				onClose,
			});
		},
	};
};
