import { McpServer } from "@effect/ai";
import { HttpRouter } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import {
	DawIpcClient,
	DawIpcClientLive,
} from "./dawIpcClient";
import { DawToolkit } from "./toolkit";
import { handleCreateInstrument } from "./handlers";

const port =
	Number.parseInt(process.env.DAW_MCP_PORT ?? "43124", 10) ??
	43124;

const ToolHandlersLive = DawToolkit.toLayer({
	"daw.instrument.create": handleCreateInstrument,
});

const RegisterToolsLive = Layer.effectDiscard(McpServer.registerToolkit(DawToolkit)).pipe(
	Layer.provide(ToolHandlersLive),
);

const McpLive = Layer.mergeAll(
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
	Layer.provide(BunHttpServer.layer({ port })),
	Layer.provide(DawIpcClientLive()),
);

BunRuntime.runMain(Layer.launch(McpLive));

