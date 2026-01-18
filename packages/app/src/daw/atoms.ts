import type { Instrument, Project, SSE } from "@daw/contract";
import * as Atom from "@effect-atom/atom/Atom";
import type * as Registry from "@effect-atom/atom/Registry";

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

/** Active locks (from lock events) */
export const locksAtom = Atom.make<
	ReadonlyArray<{
		resource: string;
		clientId: string;
		acquiredAt: number;
	}>
>([]);

/**
 * Apply a snapshot to update all relevant atoms
 */
export const applySnapshot = (
	registry: Registry.Registry,
	snapshot: Project.Snapshot,
) => {
	registry.update(instrumentsAtom, () => snapshot.doc.instruments);
	registry.update(versionAtom, () => snapshot.version);
};

/**
 * Apply a patch batch to update instruments
 */
export const applyPatchBatch = (
	registry: Registry.Registry,
	batch: Project.PatchBatch,
	currentVersion: number,
): number => {
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
	registry.update(versionAtom, () => batch.version);

	return batch.version;
};

/**
 * Apply a submit operation directly (for local optimistic updates)
 */
export const applySubmit = (
	registry: Registry.Registry,
	submit: Project.Submit,
	instrumentId: Instrument.InstrumentId,
) => {
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
};

/**
 * Handle SSE events and update atoms accordingly
 */
export const handleSSEEvent = (
	registry: Registry.Registry,
	event: SSE.SSEEvent,
	versionRef: { current: number },
	onGapDetected?: (trigger: string) => void,
) => {
	switch (event.t) {
		case "server.connected":
			registry.update(sseConnectedAtom, () => true);
			registry.update(logsAtom, (l: ReadonlyArray<string>) => [
				...l,
				`← (sse) connected, server version: ${event.serverVersion}`,
			]);
			break;

		case "server.heartbeat":
			// Heartbeats are just for keeping the connection alive, no state update needed
			break;

		case "op": {
			const entry = event.entry;
			if (entry.version <= versionRef.current) return;
			if (entry.version !== versionRef.current + 1) {
				// Gap detected, need recovery
				onGapDetected?.(`sse:op:${entry.version}`);
				return;
			}
			versionRef.current = entry.version;
			registry.update(versionAtom, () => entry.version);
			applySubmit(
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
			versionRef.current = applyPatchBatch(registry, batch, versionRef.current);
			break;
		}

		case "presence":
			registry.update(presenceAtom, () => event.clients);
			registry.update(logsAtom, (l: ReadonlyArray<string>) => [
				...l,
				`← (presence) ${event.clients.length} online`,
			]);
			break;

		case "locks":
			registry.update(locksAtom, () => event.locks);
			registry.update(logsAtom, (l: ReadonlyArray<string>) => [
				...l,
				`← (locks) ${event.locks.length} active`,
			]);
			break;
	}
};

/**
 * Add a log entry
 */
export const addLog = (registry: Registry.Registry, message: string) => {
	registry.update(logsAtom, (l: ReadonlyArray<string>) => [...l, message]);
};
