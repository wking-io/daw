import { Toolkit } from "@effect/ai";
import { CreateProjectTool } from "./project/tools";

export const DawToolkit = Toolkit.make(CreateProjectTool);
