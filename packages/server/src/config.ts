import { Config, ConfigProvider, Context, Layer } from "effect";
import path from "path";
import { getDefaultDBLocation } from "./persist/get-default-db-location";

export interface ServerConfigService {
	readonly statePort: number;
	readonly stateDbPath: string;
}

export class ServerConfig extends Context.Tag("daw/ServerConfig")<
	ServerConfig,
	ServerConfigService
>() {}

const ServerConfigSchema = Config.all({
	statePort: Config.port("DAW_STATE_PORT").pipe(Config.withDefault(43125)),
	stateDbPath: Config.string("DAW_STATE_DB").pipe(
		Config.map((value) => path.resolve(value)),
		Config.withDefault(getDefaultDBLocation()),
	),
});

export const ServerConfigLive = Layer.effect(
	ServerConfig,
	ConfigProvider.fromEnv().load(ServerConfigSchema),
);

export const ServerConfigTest = (
	overrides: Partial<ServerConfigService> = {},
) => {
	const entries = new Map<string, string>();

	if (overrides.statePort !== undefined) {
		entries.set("DAW_STATE_PORT", String(overrides.statePort));
	}

	if (overrides.stateDbPath !== undefined) {
		entries.set("DAW_STATE_DB", overrides.stateDbPath);
	}

	return Layer.effect(
		ServerConfig,
		ConfigProvider.fromMap(entries).load(ServerConfigSchema),
	);
};
