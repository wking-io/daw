import { InstrumentTools } from "@daw/contract";
import { Tool, Toolkit } from "@effect/ai";
import { DawStateClient } from "./dawIpcClient";

export const CreateInstrumentTool = Tool.make(InstrumentTools.CreateTool.name, {
	description: InstrumentTools.CreateTool.description,
	parameters: InstrumentTools.CreateTool.inputSchema.fields,
	success: InstrumentTools.CreateTool.outputSchema,
	dependencies: [DawStateClient],
});

export const DawToolkit = Toolkit.make(CreateInstrumentTool);
