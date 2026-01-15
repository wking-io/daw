import { CreateCommand, CreateResult } from "./commands";

export const CreateName = "daw.instrument.create";

export const CreateTool = {
	name: CreateName,
	description: "Create a new instrument in the DAW",
	inputSchema: CreateCommand,
	outputSchema: CreateResult,
} as const;

/**
 * Exported MCP-facing tool registry.
 * The MCP server sidecar imports this to advertise supported tools.
 */
export const Tools = [CreateTool] as const;
