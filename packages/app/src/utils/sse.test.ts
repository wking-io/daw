import { type Events, Versions } from "@daw/core";
import { describe, expect, it } from "vitest";
import { createEventCoalescer, getEventsKey } from "./sse";

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

describe("getEventsKey", () => {
	it("returns key for heartbeat events", () => {
		const event: Events.ServerEvent = {
			t: "server.heartbeat",
			timestamp: Date.now(),
		};
		expect(getEventsKey(event)).toBe("server.heartbeat");
	});

	it("returns undefined for events batch (not coalesced)", () => {
		const event: Events.EditorEventBatch = {
			t: "events",
			version: Versions.ProjectVersion.make(1),
			events: [],
		};
		expect(getEventsKey(event)).toBeUndefined();
	});

	it("returns undefined for server.connected events", () => {
		const event: Events.ProjectSubscribedEvent = {
			t: "project.subscribed",
			version: Versions.ProjectVersion.make(0),
			timestamp: Date.now(),
		};
		expect(getEventsKey(event)).toBeUndefined();
	});
});
