import { describe, expect, it, vi } from "vitest";
import { createEventCoalescer, getSSEEventKey } from "./sse";
import type { SSE } from "@daw/contract";

describe("createEventCoalescer", () => {
	it("batches events and flushes them", async () => {
		const flushed: string[][] = [];
		const coalescer = createEventCoalescer<string>({
			getKey: () => undefined,
			onFlush: (events) => flushed.push(events),
			intervalMs: 10,
		});

		coalescer.push("a");
		coalescer.push("b");
		coalescer.push("c");

		// Events should be queued, not flushed yet
		expect(flushed).toHaveLength(0);

		// Wait for flush
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(flushed).toHaveLength(1);
		expect(flushed[0]).toEqual(["a", "b", "c"]);

		coalescer.stop();
	});

	it("coalesces events with the same key", async () => {
		const flushed: Array<{ id: number; value: string }[]> = [];
		const coalescer = createEventCoalescer<{ id: number; value: string }>({
			getKey: (e) => String(e.id),
			onFlush: (events) => flushed.push(events),
			intervalMs: 10,
		});

		coalescer.push({ id: 1, value: "first" });
		coalescer.push({ id: 2, value: "second" });
		coalescer.push({ id: 1, value: "updated" }); // Should replace first event with id=1

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(flushed).toHaveLength(1);
		// Only the latest event for id=1 should be present
		expect(flushed[0]).toEqual([
			{ id: 2, value: "second" },
			{ id: 1, value: "updated" },
		]);

		coalescer.stop();
	});

	it("flushes immediately when stop is called", () => {
		const flushed: string[][] = [];
		const coalescer = createEventCoalescer<string>({
			getKey: () => undefined,
			onFlush: (events) => flushed.push(events),
			intervalMs: 1000, // Long interval
		});

		coalescer.push("a");
		coalescer.push("b");

		// Not flushed yet
		expect(flushed).toHaveLength(0);

		// Force flush
		coalescer.stop();

		expect(flushed).toHaveLength(1);
		expect(flushed[0]).toEqual(["a", "b"]);
	});

	it("handles empty flush gracefully", () => {
		const flushed: string[][] = [];
		const coalescer = createEventCoalescer<string>({
			getKey: () => undefined,
			onFlush: (events) => flushed.push(events),
			intervalMs: 10,
		});

		coalescer.stop();

		// No events were pushed, so no flush should occur
		expect(flushed).toHaveLength(0);
	});
});

describe("getSSEEventKey", () => {
	it("returns key for heartbeat events", () => {
		const event: SSE.ServerHeartbeatEvent = {
			t: "server.heartbeat",
			timestamp: Date.now(),
		};
		expect(getSSEEventKey(event)).toBe("heartbeat");
	});

	it("returns key for presence events", () => {
		const event: SSE.PresenceEvent = {
			t: "presence",
			clients: ["client1", "client2"],
		};
		expect(getSSEEventKey(event)).toBe("presence");
	});

	it("returns key for locks events", () => {
		const event: SSE.LockEvent = {
			t: "locks",
			locks: [],
		};
		expect(getSSEEventKey(event)).toBe("locks");
	});

	it("returns undefined for op events (not coalesced)", () => {
		const event: SSE.OpEvent = {
			t: "op",
			entry: {
				version: 1,
				submit: {
					opId: "op1",
					baseVersion: 0,
					actor: "ui",
					op: { t: "instrument.create", type: "synth", name: "Test" },
				},
			},
		};
		expect(getSSEEventKey(event)).toBeUndefined();
	});

	it("returns undefined for patch events (not coalesced)", () => {
		const event: SSE.PatchEvent = {
			t: "patch",
			batch: {
				version: 1,
				patches: [],
			},
		};
		expect(getSSEEventKey(event)).toBeUndefined();
	});

	it("returns undefined for server.connected events", () => {
		const event: SSE.ServerConnectedEvent = {
			t: "server.connected",
			serverVersion: 0,
		};
		expect(getSSEEventKey(event)).toBeUndefined();
	});
});
