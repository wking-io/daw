import type { Project } from "@daw/contract";

export type WorkletPort = MessagePort;

export function sendAudioDeltasToWorklet(
	port: WorkletPort,
	batch: Project.AudioDeltaBatch,
) {
	for (const delta of batch.deltas) {
		port.postMessage(delta);
	}
}
