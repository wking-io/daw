import type { Domain, Operations, TrackId } from "@daw/contract";
import { Tool } from "@effect/ai";
import { Schema } from "effect";
import { DawRepository } from "./repo";

// Tool schemas for DAW operations

const CreateTrackInput = Schema.Struct({
	projectId: Schema.String,
	trackType: Schema.Literal("audio", "midi", "bus"),
	name: Schema.String,
});

const CreateTrackOutput = Schema.Struct({
	ok: Schema.Boolean,
	trackId: Schema.optional(Schema.String),
	error: Schema.optional(Schema.String),
});

export const CreateTrackTool = Tool.make("daw.track.create", {
	description: "Create a new track in the DAW project",
	parameters: CreateTrackInput.fields,
	success: CreateTrackOutput,
	dependencies: [DawRepository],
});

// Export for backwards compatibility during transition
export { CreateTrackTool as CreateInstrumentTool };
