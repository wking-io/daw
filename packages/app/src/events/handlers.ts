import type { Events, SSE } from "@daw/contract";
import { Atom, type Registry } from "@effect-atom/atom-react";
import * as Snapshot from "../instruments";
import * as Logs from "../logs/handlers";
import { connectedAtom } from "./atoms";

/** Current project version */
export const versionAtom = Atom.make<number>(0);

// =============================================================================
// SSE Event Handler
// =============================================================================

/**
 * Handle an SSE event and update the appropriate atoms.
 * This is called directly from the SSE connection callback in AppRoot.
 */
export function handleSSEEventWithRegistry(
	registry: Registry.Registry,
	event: SSE.SSEEvent,
	versionRef: { current: number },
	onGapDetected?: (trigger: string) => void,
): void {
	switch (event.t) {
		case "server.heartbeat":
			break;

		case "server.connected":
			registry.set(connectedAtom, true);
			Logs.push(
				registry,
				`← (sse) connected, server version: ${event.serverVersion}`,
			);
			break;

		case "events": {
			const batch = event.batch;
			if (batch.version <= versionRef.current) return;
			if (batch.version !== versionRef.current + 1) {
				// Gap detected, need recovery
				onGapDetected?.(`sse:events:${batch.version}`);
				return;
			}
			versionRef.current = applyEventBatchWithRegistry(
				registry,
				batch,
				versionRef.current,
			);
			break;
		}
	}
}

// =============================================================================
// Registry Helper Functions
// =============================================================================

/**
 * Apply a snapshot using the registry directly
 */
export function applySnapshotWithRegistry(
	registry: Registry.Registry,
	snapshot: Events.Snapshot,
): void {
	registry.set(Snapshot.atom, snapshot);
	registry.set(versionAtom, snapshot.version);
}

/**
 * Apply an event batch using the registry directly
 */
export function applyEventBatchWithRegistry(
	registry: Registry.Registry,
	batch: Events.EventBatch,
	currentVersion: number,
): number {
	if (batch.version <= currentVersion) return currentVersion;

	// For now, just update the version
	// TODO: Apply individual events to update local state
	registry.set(versionAtom, batch.version);

	return batch.version;
}

/** @deprecated Use applyEventBatchWithRegistry instead */
export const applyPatchBatchWithRegistry = applyEventBatchWithRegistry;
