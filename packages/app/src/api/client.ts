import { AtomHttpApi } from "@daw/atom-remix";
import { Api } from "@daw/core/api/endpoints";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";

export interface ApiClientConfig {
	baseUrl: string;
	token: string;
}

let config: ApiClientConfig | null = null;

export function configureApiClient(newConfig: ApiClientConfig): void {
	config = newConfig;
}

export function getApiClientConfig(): ApiClientConfig {
	if (!config) {
		throw new Error(
			"ApiClient not configured. Call configureApiClient() before using the API.",
		);
	}
	return config;
}

export class ApiClient extends AtomHttpApi.Tag<ApiClient>()("ApiClient", {
	api: Api,
	httpClient: FetchHttpClient.layer,
	get baseUrl() {
		return getApiClientConfig().baseUrl;
	},
	get transformClient() {
		const { token } = getApiClientConfig();
		return token
			? (client: HttpClient.HttpClient) =>
					HttpClient.mapRequest(client, (req) =>
						HttpClientRequest.setHeader(
							req,
							"Authorization",
							`Bearer ${token}`,
						),
					)
			: undefined;
	},
}) {}
