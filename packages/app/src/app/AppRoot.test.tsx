import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "./AppProviders";
import { AppRoot } from "./AppRoot";

type OpHandler = (entry: {
	version: number;
	submit: {
		opId: string;
		baseVersion: number;
		actor: "ui" | "agent";
		op: {
			t: "instrument.create";
			type: string;
			name: string;
			instrumentId: string;
			createdAt: number;
		};
	};
}) => void;

let opHandler: OpHandler = () => {};

const mockClient = {
	getSnapshot: vi.fn(async () => ({
		version: 0,
		doc: { instruments: [] },
	})),
	submitOp: vi.fn(async () => ({
		version: 0,
		patches: { version: 0, patches: [] },
		audioDeltas: { version: 0, deltas: [] },
	})),
	getOps: vi.fn(async () => ({
		fromVersion: 0,
		ops: [],
	})),
	connectOps: vi.fn(({ onOp }: { onOp: OpHandler }) => {
		opHandler = onOp;
		return () => {};
	}),
};

vi.mock("../rpc/client", () => ({
	createDawStateClient: vi.fn(() => mockClient),
}));

describe("AppRoot", () => {
	it("renders and handles daw.instrument.create commands", async () => {
		opHandler = () => {};

		render(
			<AppProviders>
				<AppRoot />
			</AppProviders>,
		);

		expect(screen.getByText("DAW")).toBeInTheDocument();
		await waitFor(() => expect(opHandler).toBeTypeOf("function"));

		opHandler({
			version: 1,
			submit: {
				opId: "op-1",
				baseVersion: 0,
				actor: "ui",
				op: {
					t: "instrument.create",
					type: "synth",
					name: "Bass",
					instrumentId: "inst-1",
					createdAt: Date.now(),
				},
			},
		});

		// Instrument should appear in the list.
		expect(await screen.findByText(/synth: Bass/)).toBeInTheDocument();
	});
});
