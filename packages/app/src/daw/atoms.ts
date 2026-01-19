/**
 * DAW State Atoms
 *
 * This module re-exports all atoms and helper functions from the SSE module.
 */

// Re-export all atoms
export {
	instrumentsAtom,
	logsAtom,
	versionAtom,
	serverReadyAtom,
	sseConnectedAtom,
	presenceAtom,
} from "./sse";

// Re-export helper functions
export {
	handleSSEEventWithRegistry,
	applySnapshotWithRegistry,
	applyPatchBatchWithRegistry,
	applySubmitWithRegistry,
	addLogWithRegistry,
} from "./sse";
