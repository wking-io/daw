import { McpServer } from "@effect/ai";
import { HttpRouter } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import type { McpConfigService } from "./config";
import { McpConfig, McpConfigLive } from "./config";
import { DawStateClientLive } from "./dawIpcClient";
import { handleCreateInstrument } from "./handlers";
import { DawToolkit } from "./toolkit";

const ToolHandlersLive = DawToolkit.toLayer({
	"daw.instrument.create": handleCreateInstrument,
});

const RegisterToolsLive = Layer.effectDiscard(
	McpServer.registerToolkit(DawToolkit),
).pipe(Layer.provide(ToolHandlersLive));

const makeMcpLive = (config: McpConfigService) =>
	Layer.mergeAll(
		RegisterToolsLive,
		// Expose the HTTP routes
		HttpRouter.Default.serve(),
	).pipe(
		Layer.provide(
			McpServer.layerHttp({
				name: "DAW",
				version: "0.0.0",
				path: "/mcp",
			}),
		),
		Layer.provide(BunHttpServer.layer({ port: config.mcpPort })),
		Layer.provide(DawStateClientLive),
	);

const Main = Effect.gen(function* () {
	const config = yield* McpConfig;
	yield* Layer.launch(makeMcpLive(config)).pipe(Effect.scoped);
}).pipe(Effect.provide(McpConfigLive));

BunRuntime.runMain(Main);
