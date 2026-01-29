import { makeTracingLayer } from "@daw/core/tracing";
import { McpServer, Toolkit } from "@effect/ai";
import { FetchHttpClient, HttpRouter } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { McpConfig, McpConfigLive } from "./config";
import { ProjectRepository } from "./project/repo";
import { ProjectToolkit, ProjectToolkitLive } from "./project/tools";

const RegisterToolsLive = Layer.effectDiscard(
	McpServer.registerToolkit(Toolkit.merge(ProjectToolkit)),
).pipe(Layer.provide(ProjectToolkitLive));

const TracingLive = makeTracingLayer("daw-mcp", "0.0.0");

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
		Layer.provide(ProjectRepository.Default),
		Layer.provide(FetchHttpClient.layer),
	);
	return yield* Layer.launch(program).pipe(Effect.scoped);
}).pipe(Effect.provide(Layer.merge(McpConfigLive, TracingLive)));

BunRuntime.runMain(Main);
