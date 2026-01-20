import * as Instruments from "@app/instruments";
import * as Logs from "@app/logs/handlers";
import type { Events, Instrument, Project } from "@daw/contract";
import { Atom, type Registry } from "@effect-atom/atom-react";
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
	event: Events.Event,
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
	registry.set(Instruments.atom, snapshot.doc.instruments);
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
		Instruments.atom,
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
		Instruments.atom,
		(prev: ReadonlyArray<Instrument.Instrument>) => [...prev, instrument],
	);
}
