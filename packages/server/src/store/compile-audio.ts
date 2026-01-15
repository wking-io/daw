import type { Project } from "@daw/contract";

export function compileAudioDeltas(
	_batch: Project.PatchBatch,
): Project.AudioDeltaBatch {
	return {
		version: _batch.version,
		deltas: [],
	};
}
