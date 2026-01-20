import { Api } from "@daw/contract";
import { HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect, Redacted } from "effect";
import { McpConfig, McpConfigLive } from "./config";

export class ApiClient extends Effect.Service<ApiClient>()("mcp/ApiClient", {
	effect: Effect.gen(function* () {
		const config = yield* McpConfig;
		const token = Redacted.value(config.serverToken);
		const client = yield* HttpApiClient.make(Api, {
			baseUrl: `http://${config.serverHost}:${config.serverPort}`,
			transformClient: HttpClient.mapRequest(
				HttpClientRequest.setHeader("Authorization", `Bearer ${token}`),
			),
		});
		return client;
	}),
	dependencies: [McpConfigLive],
}) {}
