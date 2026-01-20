// Stubbed audio worklet bridge
// Audio delta batches will be implemented when audio features are added

export type WorkletPort = MessagePort;

export function sendAudioDeltasToWorklet(
	_port: WorkletPort,
	_deltas: unknown[],
) {
	// No-op for now - audio features not yet implemented
}
