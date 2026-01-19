import type { Events, Instrument, Project } from "@daw/contract";
import * as Registry from "@effect-atom/atom/Registry";
import { beforeEach, describe, expect, it } from "vitest";
import {
	addLogWithRegistry,
	applyPatchBatchWithRegistry,
	applySnapshotWithRegistry,
	applySubmitWithRegistry,
	handleSSEEventWithRegistry,
	instrumentsAtom,
	logsAtom,
	presenceAtom,
	sseConnectedAtom,
	versionAtom,
} from "./atoms";

describe("atoms", () => {
	let registry: Registry.Registry;

	beforeEach(() => {
		registry = Registry.make();
	});

	describe("applySnapshotWithRegistry", () => {
		it("updates instruments and version atoms", () => {
			const snapshot: Project.Snapshot = {
				version: 5,
				doc: {
					instruments: [
						{
							id: "inst-1" as Instrument.InstrumentId,
							type: "synth",
							name: "Bass",
							params: {},
							createdAt: new Date(),
						},
					],
				},
			};

			applySnapshotWithRegistry(registry, snapshot);

			expect(registry.get(instrumentsAtom)).toHaveLength(1);
			expect(registry.get(instrumentsAtom)[0]?.name).toBe("Bass");
			expect(registry.get(versionAtom)).toBe(5);
		});
	});

	describe("applyPatchBatchWithRegistry", () => {
		it("adds instruments from patches", () => {
			const instrument: Instrument.Instrument = {
				id: "inst-2" as Instrument.InstrumentId,
				type: "drum",
				name: "Kick",
				params: {},
				createdAt: new Date(),
			};

			const batch: Project.PatchBatch = {
				version: 1,
				patches: [{ t: "instrument.add", instrument }],
			};

			const newVersion = applyPatchBatchWithRegistry(registry, batch, 0);

			expect(newVersion).toBe(1);
			expect(registry.get(instrumentsAtom)).toHaveLength(1);
			expect(registry.get(instrumentsAtom)[0]?.name).toBe("Kick");
			expect(registry.get(versionAtom)).toBe(1);
		});

		it("ignores patches with version <= current", () => {
			const batch: Project.PatchBatch = {
				version: 1,
				patches: [],
			};

			const newVersion = applyPatchBatchWithRegistry(registry, batch, 5);

			expect(newVersion).toBe(5);
		});
	});

	describe("applySubmitWithRegistry", () => {
		it("creates instrument from submit op", () => {
			const instrumentId = "inst-3" as Instrument.InstrumentId;
			const submit: Project.Submit = {
				opId: "op-1",
				baseVersion: 0,
				actor: "ui",
				op: {
					t: "instrument.create",
					type: "sampler",
					name: "Piano",
					instrumentId,
					createdAt: Date.now(),
				},
			};

			applySubmitWithRegistry(registry, submit, instrumentId);

			expect(registry.get(instrumentsAtom)).toHaveLength(1);
			expect(registry.get(instrumentsAtom)[0]?.name).toBe("Piano");
			expect(registry.get(instrumentsAtom)[0]?.type).toBe("sampler");
		});
	});

	describe("addLogWithRegistry", () => {
		it("appends log messages", () => {
			addLogWithRegistry(registry, "First message");
			addLogWithRegistry(registry, "Second message");

			expect(registry.get(logsAtom)).toEqual([
				"First message",
				"Second message",
			]);
		});
	});

	describe("handleSSEEventWithRegistry", () => {
		it("handles server.connected event", () => {
			const versionRef = { current: 0 };
			const event: Events.ServerConnectedEvent = {
				t: "server.connected",
				serverVersion: 5,
			};

			handleSSEEventWithRegistry(registry, event, versionRef);

			expect(registry.get(sseConnectedAtom)).toBe(true);
			expect(registry.get(logsAtom)).toContainEqual(
				expect.stringContaining("connected"),
			);
		});

		it("handles operation event and updates state", () => {
			const versionRef = { current: 0 };
			const event: Events.OperationEvent = {
				t: "operation",
				entry: {
					version: 1,
					submit: {
						opId: "op-1",
						baseVersion: 0,
						actor: "ui",
						op: {
							t: "instrument.create",
							type: "synth",
							name: "Lead",
							instrumentId: "inst-1" as Instrument.InstrumentId,
							createdAt: Date.now(),
						},
					},
				},
			};

			handleSSEEventWithRegistry(registry, event, versionRef);

			expect(versionRef.current).toBe(1);
			expect(registry.get(versionAtom)).toBe(1);
			expect(registry.get(instrumentsAtom)).toHaveLength(1);
			expect(registry.get(instrumentsAtom)[0]?.name).toBe("Lead");
		});

		it("calls gap recovery on version mismatch", () => {
			const versionRef = { current: 0 };
			const onGapDetected = vi.fn();
			const event: Events.OperationEvent = {
				t: "operation",
				entry: {
					version: 5, // Gap: expected 1
					submit: {
						opId: "op-1",
						baseVersion: 4,
						actor: "ui",
						op: {
							t: "instrument.create",
							type: "synth",
							name: "Lead",
							instrumentId: "inst-1" as Instrument.InstrumentId,
							createdAt: Date.now(),
						},
					},
				},
			};

			handleSSEEventWithRegistry(registry, event, versionRef, onGapDetected);

			expect(onGapDetected).toHaveBeenCalledWith("sse:operation:5");
			expect(registry.get(instrumentsAtom)).toHaveLength(0); // Not applied
		});

		it("handles presence event", () => {
			const versionRef = { current: 0 };
			const event: Events.PresenceEvent = {
				t: "presence",
				clients: ["client-1", "client-2"],
			};

			handleSSEEventWithRegistry(registry, event, versionRef);

			expect(registry.get(presenceAtom)).toEqual(["client-1", "client-2"]);
		});
	});

	describe("atoms initial state", () => {
		it("instrumentsAtom starts empty", () => {
			expect(registry.get(instrumentsAtom)).toEqual([]);
		});

		it("logsAtom starts empty", () => {
			expect(registry.get(logsAtom)).toEqual([]);
		});

		it("versionAtom starts at 0", () => {
			expect(registry.get(versionAtom)).toBe(0);
		});

		it("sseConnectedAtom starts false", () => {
			expect(registry.get(sseConnectedAtom)).toBe(false);
		});

		it("presenceAtom starts empty", () => {
			expect(registry.get(presenceAtom)).toEqual([]);
		});
	});
});

// Need to import vi for the mock
import { vi } from "vitest";
