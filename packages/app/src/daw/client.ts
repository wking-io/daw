import { Api, Commands, Events, SSE } from "@daw/contract";
import { FetchHttpClient } from "@effect/platform";
import { AtomHttpApi } from "@effect-atom/atom-react";
import { Schema } from "effect";

const defaultPort = Number.parseInt(
	import.meta.env.VITE_DAW_STATE_PORT ?? "43125",
	10,
);

const resolveBaseUrl = (options?: {
	baseUrl?: string;
	host?: string;
	port?: number;
}) => {
	if (options?.baseUrl) return options.baseUrl;
	const host = options?.host ?? "127.0.0.1";
	const port = options?.port ?? defaultPort;
	return `http://${host}:${port}`;
};

/**
 * DawClient using AtomHttpApi for type-safe HTTP operations with Effect-Atom integration.
 *
 * Usage:
 * ```ts
 * // Query for readonly data
 * const snapshot = useAtomValue(DawClient.query("project", "getSnapshot", { reactivityKeys: ["snapshot"] }))
 *
 * // Mutation for write operations
 * const executeCommand = useAtomSet(DawClient.mutation("project", "executeCommand"))
 * executeCommand({ payload: { ... }, reactivityKeys: ["snapshot"] })
 * ```
 */
export class DawClient extends AtomHttpApi.Tag<DawClient>()("DawClient", {
	api: Api,
	httpClient: FetchHttpClient.layer,
	baseUrl: resolveBaseUrl(),
}) {}

/** Reactivity keys for cache invalidation */
export const ReactivityKeys = {
	snapshot: "snapshot",
	events: "events",
	health: "health",
} as const;

/**
 * Helper to decode an event batch from SSE
 */
export const decodeEventBatch = Schema.decodeUnknownSync(Events.EventBatch);
