import { Api } from "@daw/contract";
import { FetchHttpClient } from "@effect/platform";
import { AtomHttpApi } from "@effect-atom/atom-react";

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

export class ApiClient extends AtomHttpApi.Tag<ApiClient>()("ApiClient", {
	api: Api,
	httpClient: FetchHttpClient.layer,
	baseUrl: resolveBaseUrl(),
}) {}
