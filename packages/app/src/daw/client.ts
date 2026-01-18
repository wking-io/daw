import { api, Project } from "@daw/contract";
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
 * const snapshot = useAtomValue(DawClient.query("daw", "snapshot", { reactivityKeys: ["snapshot"] }))
 *
 * // Mutation for write operations
 * const submitOp = useAtomSet(DawClient.mutation("daw", "submitOp"))
 * submitOp({ payload: { ... }, reactivityKeys: ["snapshot", "instruments"] })
 * ```
 */
export class DawClient extends AtomHttpApi.Tag<DawClient>()("DawClient", {
	api: api,
	httpClient: FetchHttpClient.layer,
	baseUrl: resolveBaseUrl(),
}) {}

/** Reactivity keys for cache invalidation */
export const ReactivityKeys = {
	snapshot: "snapshot",
	instruments: "instruments",
	ops: "ops",
	health: "health",
} as const;

/**
 * Helper to decode an operation entry from SSE
 */
export const decodeOpEntry = Schema.decodeUnknownSync(Project.OperationEntry);

/**
 * Helper to decode a patch batch from SSE
 */
export const decodePatchBatch = Schema.decodeUnknownSync(Project.PatchBatch);
