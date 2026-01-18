import { Toolkit } from "@effect/ai";
import { CreateInstrumentTool } from "./instruments/tools";

export const DawToolkit = Toolkit.make(CreateInstrumentTool);
