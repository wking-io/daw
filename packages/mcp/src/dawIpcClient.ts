import { Project } from "@daw/contract";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import type { HttpClientError } from "@effect/platform/HttpClientError";
import { Context, Effect, Layer, Schema } from "effect";
import type { ParseError } from "effect/ParseResult";
import { McpConfig } from "./config";

export class DawStateClient extends Context.Tag("daw/DawStateClient")<
	DawStateClient,
	{
		readonly getSnapshot: () => Effect.Effect<
			Project.Snapshot,
			HttpClientError | ParseError
		>;
		readonly submitOp: (
			req: Project.Submit,
		) => Effect.Effect<Project.SubmitResult, HttpClientError | ParseError>;
	}
>() {}

/**
 * Effect-native client for the DAW state sidecar:
 * `GET http://127.0.0.1:${DAW_STATE_PORT}/snapshot`
 * `POST http://127.0.0.1:${DAW_STATE_PORT}/submitOp`
 */
export const DawStateClientLive = Layer.effect(
	DawStateClient,
	Effect.gen(function* () {
		const client = yield* HttpClient.HttpClient;
		const config = yield* McpConfig;

		const baseUrl = `http://${config.dawStateHost}:${config.dawStatePort}`;

		return {
			getSnapshot: () =>
				HttpClientRequest.get(`${baseUrl}/snapshot`).pipe(
					client.execute,
					Effect.flatMap((res) => res.json),
					Effect.flatMap(Schema.decodeUnknown(Project.Snapshot)),
				),
			submitOp: (req) =>
				HttpClientRequest.post(`${baseUrl}/submitOp`).pipe(
					HttpClientRequest.setHeader("content-type", "application/json"),
					HttpClientRequest.bodyUnsafeJson(req),
					client.execute,
					Effect.flatMap((res) => res.json),
					Effect.flatMap(Schema.decodeUnknown(Project.SubmitResult)),
				),
		} as const;
	}),
).pipe(Layer.provide(FetchHttpClient.layer));
