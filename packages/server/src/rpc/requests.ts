import { Project } from "@daw/contract";
import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";

export class ProjectRpcs extends RpcGroup.make(
	Rpc.make("GetSnapshot", {
		success: Project.Snapshot,
	}),
	Rpc.make("SubmitOp", {
		payload: Project.Submit,
		success: Project.SubmitResult,
	}),
	Rpc.make("PatchStream", {
		payload: {
			fromVersion: Schema.Number,
		},
		success: Project.PatchBatch,
		stream: true,
	}),
	Rpc.make("AudioDeltaStream", {
		payload: {
			fromVersion: Schema.Number,
		},
		success: Project.AudioDeltaBatch,
		stream: true,
	}),
) {}
