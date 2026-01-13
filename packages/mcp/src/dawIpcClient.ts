import { FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform";
import type { HttpClientError } from "@effect/platform/HttpClientError";
import { Context, Effect, Layer, Schema } from "effect";
import { CreateInstrumentCommand } from "@daw/contract";

export interface DawCommandHttpRequest {
	readonly requestId: string;
	readonly name: string;
	readonly payload: unknown;
}

export class DawIpcClient extends Context.Tag("daw/DawIpcClient")<
	DawIpcClient,
	{
		readonly postCommand: (
			req: DawCommandHttpRequest,
		) => Effect.Effect<unknown, HttpClientError>;
	}
>() {}

/**
 * Effect-native client for the DAW Tauri-hosted IPC endpoint:
 * `POST http://127.0.0.1:${DAW_IPC_PORT}/command`
 */
export const DawIpcClientLive = (options?: {
	readonly host?: string;
	readonly port?: number;
}): Layer.Layer<DawIpcClient> =>
	Layer.effect(
		DawIpcClient,
		Effect.gen(function* () {
			const client = yield* HttpClient.HttpClient;

			const host = options?.host ?? "127.0.0.1";
			const port =
				options?.port ??
				Number.parseInt(process.env.DAW_IPC_PORT ?? "43123", 10) ??
				43123;

			const url = `http://${host}:${port}/command`;

			return {
				postCommand: (req) =>
					HttpClientRequest.post(url).pipe(
						HttpClientRequest.setHeader("content-type", "application/json"),
						HttpClientRequest.bodyUnsafeJson(req),
						client.execute,
						Effect.flatMap((res) => res.json),
					),
			} as const;
		}),
	).pipe(Layer.provide(FetchHttpClient.layer));

export const decodeCreateInstrumentArgs = Schema.decodeUnknownSync(
	CreateInstrumentCommand,
);

