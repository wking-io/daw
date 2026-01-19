import type { Events, Instrument, Project } from "@daw/contract";
import * as Atom from "@effect-atom/atom/Atom";
import type * as Registry from "@effect-atom/atom/Registry";

// =============================================================================
// State Atoms
// =============================================================================

/** Current list of instruments */
export const instrumentsAtom = Atom.make<ReadonlyArray<Instrument.Instrument>>(
	[],
);

/** Command/event log for debugging */
export const logsAtom = Atom.make<ReadonlyArray<string>>([]);

/** Current project version for optimistic updates and gap detection */
export const versionAtom = Atom.make<number>(0);

/** Server health status */
export const serverReadyAtom = Atom.make<boolean>(false);

/** SSE connection status */
export const sseConnectedAtom = Atom.make<boolean>(false);

/** Connected clients (from presence events) */
export const presenceAtom = Atom.make<ReadonlyArray<string>>([]);

// =============================================================================
// SSE Event Handler
// =============================================================================

/**
 * Handle an SSE event and update the appropriate atoms.
 * This is called directly from the SSE connection callback in AppRoot.
 */
export function handleSSEEventWithRegistry(
	registry: Registry.Registry,
	event: Events.Event,
	versionRef: { current: number },
	onGapDetected?: (trigger: string) => void,
): void {
	switch (event.t) {
		case "server.connected":
			registry.set(sseConnectedAtom, true);
			registry.update(logsAtom, (prev) => [
				...prev,
				`← (sse) connected, server version: ${event.serverVersion}`,
			]);
			break;

		case "server.heartbeat":
			// Heartbeats are just for keeping the connection alive, no state update needed
			break;

		case "operation": {
			const entry = event.entry;
			if (entry.version <= versionRef.current) return;
			if (entry.version !== versionRef.current + 1) {
				// Gap detected, need recovery
				onGapDetected?.(`sse:operation:${entry.version}`);
				return;
			}
			versionRef.current = entry.version;
			registry.set(versionAtom, entry.version);
			applySubmitWithRegistry(
				registry,
				entry.submit,
				entry.submit.op.instrumentId as Instrument.InstrumentId,
			);
			break;
		}

		case "patch": {
			const batch = event.batch;
			if (batch.version <= versionRef.current) return;
			if (batch.version !== versionRef.current + 1) {
				// Gap detected, need recovery
				onGapDetected?.(`sse:patch:${batch.version}`);
				return;
			}
			versionRef.current = applyPatchBatchWithRegistry(
				registry,
				batch,
				versionRef.current,
			);
			break;
		}

		case "presence":
			registry.set(presenceAtom, event.clients);
			registry.update(logsAtom, (prev) => [
				...prev,
				`← (presence) ${event.clients.length} online`,
			]);
			break;
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
	snapshot: Project.Snapshot,
): void {
	registry.set(instrumentsAtom, snapshot.doc.instruments);
	registry.set(versionAtom, snapshot.version);
}

/**
 * Apply a patch batch using the registry directly
 */
export function applyPatchBatchWithRegistry(
	registry: Registry.Registry,
	batch: Project.PatchBatch,
	currentVersion: number,
): number {
	if (batch.version <= currentVersion) return currentVersion;

	registry.update(
		instrumentsAtom,
		(prev: ReadonlyArray<Instrument.Instrument>) => {
			let next = prev;
			for (const patch of batch.patches) {
				if (patch.t === "instrument.add") {
					next = [...next, patch.instrument];
				}
			}
			return next;
		},
	);
	registry.set(versionAtom, batch.version);

	return batch.version;
}

/**
 * Apply a submit operation using the registry directly
 */
export function applySubmitWithRegistry(
	registry: Registry.Registry,
	submit: Project.Submit,
	instrumentId: Instrument.InstrumentId,
): void {
	if (submit.op.t !== "instrument.create") return;

	const createdAtMs =
		typeof submit.op.createdAt === "number" ? submit.op.createdAt : Date.now();

	const instrument: Instrument.Instrument = {
		id: submit.op.instrumentId ?? instrumentId,
		type: submit.op.type,
		name: submit.op.name,
		params: {},
		createdAt: new Date(createdAtMs),
	};

	registry.update(
		instrumentsAtom,
		(prev: ReadonlyArray<Instrument.Instrument>) => [...prev, instrument],
	);
}

/**
 * Add a log entry using the registry directly
 */
export function addLogWithRegistry(
	registry: Registry.Registry,
	message: string,
): void {
	registry.update(logsAtom, (prev: ReadonlyArray<string>) => [
		...prev,
		message,
	]);
}
