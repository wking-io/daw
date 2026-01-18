import { InstrumentTools } from "@daw/contract";
import { Tool } from "@effect/ai";
import { InstrumentRepository } from "./repo";

export const CreateInstrumentTool = Tool.make(InstrumentTools.CreateTool.name, {
	description: InstrumentTools.CreateTool.description,
	parameters: InstrumentTools.CreateTool.inputSchema.fields,
	success: InstrumentTools.CreateTool.outputSchema,
	dependencies: [InstrumentRepository],
});
