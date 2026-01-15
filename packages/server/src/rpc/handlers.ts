import { Effect, Stream } from "effect";
import { DawStore } from "../store/store";
import { ProjectRpcs } from "./requests";

export const ProjectHandlersLive = ProjectRpcs.toLayer(
	Effect.gen(function* () {
		const store = yield* DawStore;

		return {
			GetSnapshot: () => store.getSnapshot,
			SubmitOp: (payload) => store.submitOp(payload),
			PatchStream: ({ fromVersion }) =>
				Stream.unwrap(store.patchStreamFrom(fromVersion)),
			AudioDeltaStream: ({ fromVersion }) =>
				Stream.unwrap(store.audioStreamFrom(fromVersion)),
		};
	}),
);
