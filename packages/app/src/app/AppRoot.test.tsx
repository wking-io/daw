import type { Instrument, SSE } from "@daw/contract";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "./AppProviders";
import { AppRoot } from "./AppRoot";

type SSEEventHandler = (event: SSE.SSEEvent) => void;

let sseEventHandler: SSEEventHandler = () => {};
const mockCleanup = vi.fn();

const mockGetHealth = vi.fn(async () => ({
	healthy: true,
	version: "test",
}));

const mockGetSnapshot = vi.fn(async () => ({
	version: 0,
	doc: { instruments: [] },
}));

const mockSubmitOp = vi.fn(async () => ({
	version: 1,
	patches: { version: 1, patches: [] },
	audioDeltas: { version: 1, deltas: [] },
}));

const mockGetOps = vi.fn(async () => ({
	fromVersion: 0,
	ops: [],
}));

const mockConnectSSE = vi.fn(
	({
		onEvent,
	}: {
		fromVersion: number;
		onEvent: SSEEventHandler;
		onError?: (error: Error) => void;
		onClose?: () => void;
	}) => {
		sseEventHandler = onEvent;
		// Simulate connection event
		queueMicrotask(() => {
			onEvent({
				t: "server.connected",
				serverVersion: 0,
			});
		});
		return mockCleanup;
	},
);

// Mock the http client
vi.mock("../http/client", () => ({
	createDawStateClient: vi.fn(() => ({
		getHealth: mockGetHealth,
		getSnapshot: mockGetSnapshot,
		submitOp: mockSubmitOp,
		getOps: mockGetOps,
		connectSSE: mockConnectSSE,
	})),
}));

describe("AppRoot", () => {
	beforeEach(() => {
		sseEventHandler = () => {};
		mockCleanup.mockClear();
		mockGetHealth.mockClear();
		mockGetSnapshot.mockClear();
		mockSubmitOp.mockClear();
		mockGetOps.mockClear();
		mockConnectSSE.mockClear();
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	it("renders and handles daw.instrument.create commands via SSE", async () => {
		render(
			<AppProviders>
				<AppRoot />
			</AppProviders>,
		);

		expect(screen.getByText("DAW")).toBeInTheDocument();

		// Wait for server to be ready and SSE to connect
		await waitFor(
			() => {
				expect(
					screen.queryByText("Starting server..."),
				).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);

		// Simulate an op event via SSE
		sseEventHandler({
			t: "op",
			entry: {
				version: 1,
				submit: {
					opId: "op-1",
					baseVersion: 0,
					actor: "ui",
					op: {
						t: "instrument.create",
						type: "synth",
						name: "Bass",
						instrumentId: "inst-1" as Instrument.InstrumentId,
						createdAt: Date.now(),
					},
				},
			},
		});

		// Instrument should appear in the list.
		expect(await screen.findByText(/synth: Bass/)).toBeInTheDocument();
	});
});
