import type { Events, Instrument, Project } from "@daw/contract";
import type * as Atom from "@effect-atom/atom/Atom";
import type * as Registry from "@effect-atom/atom/Registry";
import { beforeEach, describe, expect, it } from "vitest";
import {
	addLog,
	applyPatchBatch,
	applySnapshot,
	applySubmit,
	handleSSEEvent,
	instrumentsAtom,
	locksAtom,
	logsAtom,
	presenceAtom,
	sseConnectedAtom,
	versionAtom,
} from "./atoms";

// Simple mock registry that works without Effect runtime
function createMockRegistry(): Registry.Registry {
	const atomValues = new Map<Atom.Atom<unknown>, unknown>();

	const mock = {
		get<A>(atom: Atom.Atom<A>): A {
			if (!atomValues.has(atom)) {
				// Return default value - this is a simplified approach
				return (atom as unknown as { defaultValue: A }).defaultValue;
			}
			return atomValues.get(atom) as A;
		},
		update<A>(atom: Atom.Atom<A>, fn: (prev: A) => A): void {
			const current = mock.get(atom);
			atomValues.set(atom, fn(current));
		},
	};

	// Cast to Registry - we only use get and update in our atom helpers
	return mock as unknown as Registry.Registry;
}

// Define default values for atoms we're testing
(instrumentsAtom as unknown as { defaultValue: unknown }).defaultValue = [];
(logsAtom as unknown as { defaultValue: unknown }).defaultValue = [];
(versionAtom as unknown as { defaultValue: unknown }).defaultValue = 0;
(sseConnectedAtom as unknown as { defaultValue: unknown }).defaultValue = false;
(presenceAtom as unknown as { defaultValue: unknown }).defaultValue = [];
(locksAtom as unknown as { defaultValue: unknown }).defaultValue = [];

describe("atoms", () => {
	let registry: Registry.Registry;

	beforeEach(() => {
		registry = createMockRegistry();
	});

	describe("applySnapshot", () => {
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

			applySnapshot(registry, snapshot);

			expect(registry.get(instrumentsAtom)).toHaveLength(1);
			expect(registry.get(instrumentsAtom)[0]?.name).toBe("Bass");
			expect(registry.get(versionAtom)).toBe(5);
		});
	});

	describe("applyPatchBatch", () => {
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

			const newVersion = applyPatchBatch(registry, batch, 0);

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

			const newVersion = applyPatchBatch(registry, batch, 5);

			expect(newVersion).toBe(5);
		});
	});

	describe("applySubmit", () => {
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

			applySubmit(registry, submit, instrumentId);

			expect(registry.get(instrumentsAtom)).toHaveLength(1);
			expect(registry.get(instrumentsAtom)[0]?.name).toBe("Piano");
			expect(registry.get(instrumentsAtom)[0]?.type).toBe("sampler");
		});
	});

	describe("handleSSEEvent", () => {
		it("handles server.connected event", () => {
			const versionRef = { current: 0 };
			const event: Events.Event = {
				t: "server.connected",
				serverVersion: 10,
			};

			handleSSEEvent(registry, event, versionRef);

			expect(registry.get(sseConnectedAtom)).toBe(true);
			expect(registry.get(logsAtom)).toContainEqual(
				expect.stringContaining("connected"),
			);
		});

		it("handles presence event", () => {
			const versionRef = { current: 0 };
			const event: Events.Event = {
				t: "presence",
				clients: ["client-1", "client-2"],
			};

			handleSSEEvent(registry, event, versionRef);

			expect(registry.get(presenceAtom)).toEqual(["client-1", "client-2"]);
		});

		it("handles locks event", () => {
			const versionRef = { current: 0 };
			const locks = [
				{ resource: "track-1", clientId: "client-1", acquiredAt: Date.now() },
			];
			const event: Events.Event = {
				t: "locks",
				locks,
			};

			handleSSEEvent(registry, event, versionRef);

			expect(registry.get(locksAtom)).toEqual(locks);
		});

		it("handles operation event and updates version", () => {
			const versionRef = { current: 0 };
			const event: Events.Event = {
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
							instrumentId: "inst-4" as Instrument.InstrumentId,
							createdAt: Date.now(),
						},
					},
				},
			};

			handleSSEEvent(registry, event, versionRef);

			expect(versionRef.current).toBe(1);
			expect(registry.get(versionAtom)).toBe(1);
			expect(registry.get(instrumentsAtom)).toHaveLength(1);
		});

		it("detects gaps and calls recovery", () => {
			const versionRef = { current: 0 };
			let gapTrigger: string | undefined;
			const onGapDetected = (trigger: string) => {
				gapTrigger = trigger;
			};

			const event: Events.Event = {
				t: "operation",
				entry: {
					version: 5, // Gap: expected 1, got 5
					submit: {
						opId: "op-1",
						baseVersion: 0,
						actor: "ui",
						op: {
							t: "instrument.create",
							type: "synth",
							name: "Lead",
							instrumentId: "inst-5" as Instrument.InstrumentId,
							createdAt: Date.now(),
						},
					},
				},
			};

			handleSSEEvent(registry, event, versionRef, onGapDetected);

			expect(gapTrigger).toBe("sse:operation:5");
			expect(versionRef.current).toBe(0); // Version unchanged due to gap
		});

		it("handles patch event", () => {
			const versionRef = { current: 0 };
			const instrument: Instrument.Instrument = {
				id: "inst-6" as Instrument.InstrumentId,
				type: "drum",
				name: "Snare",
				params: {},
				createdAt: new Date(),
			};

			const event: Events.Event = {
				t: "patch",
				batch: {
					version: 1,
					patches: [{ t: "instrument.add", instrument }],
				},
			};

			handleSSEEvent(registry, event, versionRef);

			expect(versionRef.current).toBe(1);
			expect(registry.get(instrumentsAtom)).toHaveLength(1);
		});
	});

	describe("addLog", () => {
		it("appends log messages", () => {
			addLog(registry, "First message");
			addLog(registry, "Second message");

			expect(registry.get(logsAtom)).toEqual([
				"First message",
				"Second message",
			]);
		});
	});
});
