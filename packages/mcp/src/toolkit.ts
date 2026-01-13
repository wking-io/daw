import { Tool, Toolkit } from "@effect/ai";
import {
	CreateInstrumentCommand,
	CreateInstrumentResult as CreateInstrumentResultSchema,
} from "@daw/contract";
import { DawIpcClient } from "./dawIpcClient";

export const CreateInstrumentTool = Tool.make("daw.instrument.create", {
	description: "Create a new instrument in the DAW",
	parameters: CreateInstrumentCommand.fields,
	success: CreateInstrumentResultSchema,
}).addDependency(DawIpcClient);

export const DawToolkit = Toolkit.make(CreateInstrumentTool);

