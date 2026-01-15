import { Config, ConfigProvider, Context, Layer } from "effect";

export interface McpConfigService {
	readonly mcpPort: number;
	readonly dawStatePort: number;
	readonly dawStateHost: string;
}

export class McpConfig extends Context.Tag("daw/McpConfig")<
	McpConfig,
	McpConfigService
>() {}

const McpConfigSchema = Config.all({
	mcpPort: Config.port("DAW_MCP_PORT").pipe(Config.withDefault(43124)),
	dawStatePort: Config.port("DAW_STATE_PORT").pipe(Config.withDefault(43125)),
	dawStateHost: Config.string("DAW_STATE_HOST").pipe(
		Config.withDefault("127.0.0.1"),
	),
});

export const McpConfigLive = Layer.effect(
	McpConfig,
	ConfigProvider.fromEnv().load(McpConfigSchema),
);

export const McpConfigTest = (overrides: Partial<McpConfigService> = {}) => {
	const entries = new Map<string, string>();

	if (overrides.mcpPort !== undefined) {
		entries.set("DAW_MCP_PORT", String(overrides.mcpPort));
	}

	if (overrides.dawStatePort !== undefined) {
		entries.set("DAW_STATE_PORT", String(overrides.dawStatePort));
	}

	if (overrides.dawStateHost !== undefined) {
		entries.set("DAW_STATE_HOST", overrides.dawStateHost);
	}

	return Layer.effect(
		McpConfig,
		ConfigProvider.fromMap(entries).load(McpConfigSchema),
	);
};
