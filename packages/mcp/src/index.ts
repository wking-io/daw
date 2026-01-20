import { McpServer } from "@effect/ai";
import { FetchHttpClient, HttpRouter } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpConfig, McpConfigLive } from "./config";
import { handleCreateTrack } from "./instruments/handlers";
import { DawRepositoryLive } from "./instruments/repo";
import { DawToolkit } from "./toolkit";

const ToolHandlersLive = DawToolkit.toLayer({
	"daw.track.create": handleCreateTrack,
});

const RegisterToolsLive = Layer.effectDiscard(
	McpServer.registerToolkit(DawToolkit),
).pipe(Layer.provide(ToolHandlersLive));

const Main = Effect.gen(function* () {
	const config = yield* McpConfig;
	const program = Layer.mergeAll(
		RegisterToolsLive,
		HttpRouter.Default.serve(),
	).pipe(
		Layer.provide(
			McpServer.layerHttp({
				name: "DAW",
				version: "0.0.0",
				path: "/mcp",
			}),
		),
		Layer.provide(BunHttpServer.layer({ port: config.port })),
		Layer.provide(DawRepositoryLive),
		Layer.provide(FetchHttpClient.layer),
	);
	yield* Layer.launch(program).pipe(Effect.scoped);
}).pipe(Effect.provide(McpConfigLive));

BunRuntime.runMain(Main);
