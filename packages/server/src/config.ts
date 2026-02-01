import { Config, ConfigProvider, Context, Layer } from "effect";
import path from "path";
import { getDefaultDBLocation } from "./db/get-default-db-location";

export interface ServerConfigService {
  readonly version: string;
  readonly port: number;
  readonly db: string;
  readonly authToken: string;
  readonly enableTestStream: boolean;
}

export class ServerConfig extends Context.Tag("daw/ServerConfig")<
  ServerConfig,
  ServerConfigService
>() {}

const ServerConfigSchema = Config.all({
  version: Config.string("DAW_SERVER_VERSION").pipe(Config.withDefault("dev")),
  port: Config.port("DAW_STATE_PORT").pipe(Config.withDefault(43125)),
  db: Config.string("DAW_STATE_DB").pipe(
    Config.map((value) => path.resolve(value)),
    Config.withDefault(getDefaultDBLocation()),
  ),
  authToken: Config.string("DAW_STATE_TOKEN").pipe(
    Config.withDefault(""),
    Config.map((value) => value.trim()),
  ),
  enableTestStream: Config.boolean("DAW_STATE_TEST_STREAM").pipe(Config.withDefault(false)),
});

export const ServerConfigLive = Layer.effect(
  ServerConfig,
  ConfigProvider.fromEnv().load(ServerConfigSchema),
);

export const ServerConfigTest = (overrides: Partial<ServerConfigService> = {}) => {
  const entries = new Map<string, string>();

  if (overrides.version !== undefined) {
    entries.set("DAW_SERVER_VERSION", overrides.version);
  }

  if (overrides.port !== undefined) {
    entries.set("DAW_STATE_PORT", String(overrides.port));
  }

  if (overrides.db !== undefined) {
    entries.set("DAW_STATE_DB", overrides.db);
  }
  if (overrides.authToken !== undefined) {
    entries.set("DAW_STATE_TOKEN", overrides.authToken);
  }
  if (overrides.enableTestStream !== undefined) {
    entries.set("DAW_STATE_TEST_STREAM", String(overrides.enableTestStream));
  }

  return Layer.effect(ServerConfig, ConfigProvider.fromMap(entries).load(ServerConfigSchema));
};
