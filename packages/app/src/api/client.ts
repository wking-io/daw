import { Api } from "@daw/core";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { AtomHttpApi } from "@effect-atom/atom-react";

const token = import.meta.env.DAW_STATE_TOKEN;
const port = Number.parseInt(import.meta.env.DAW_STATE_PORT ?? "43125", 10);

/**
 * Create an ApiClient configured for the given server info.
 * This allows dynamic baseUrl and token configuration.
 *
 * The returned class provides:
 * - `.query(group, endpoint, request)` - returns an Atom that fetches data
 * - `.mutation(group, endpoint)` - returns an AtomResultFn for mutations
 * - `.runtime` - AtomRuntime for running arbitrary Effects
 * - `.layer` - Effect Layer for providing the client
 */
export class ApiClient extends AtomHttpApi.Tag<ApiClient>()("ApiClient", {
	api: Api,
	httpClient: FetchHttpClient.layer,
	baseUrl: `http://127.0.0.1:${port}`,
	transformClient: token
		? (client) =>
				HttpClient.mapRequest(client, (req) =>
					HttpClientRequest.setHeader(req, "Authorization", `Bearer ${token}`),
				)
		: undefined,
}) {}
