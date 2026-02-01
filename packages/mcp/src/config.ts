import { Config, ConfigProvider, Context, Layer, Redacted } from "effect";

export class McpConfig extends Context.Tag("mcp/Config")<
  McpConfig,
  {
    port: number;
    serverPort: number;
    serverHost: string;
    serverToken: Redacted.Redacted<string>;
  }
>() {}

const McpConfigSchema = Config.all({
  port: Config.port("DAW_MCP_PORT").pipe(Config.withDefault(43124)),
  serverPort: Config.port("DAW_STATE_PORT").pipe(Config.withDefault(43125)),
  serverHost: Config.string("DAW_STATE_HOST").pipe(Config.withDefault("127.0.0.1")),
  serverToken: Config.redacted("DAW_STATE_TOKEN").pipe(Config.withDefault(Redacted.make(""))),
});

export const McpConfigLive = Layer.effect(
  McpConfig,
  ConfigProvider.fromEnv().load(McpConfigSchema),
);
