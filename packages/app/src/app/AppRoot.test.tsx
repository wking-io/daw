import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "./AppProviders";
import { AppRoot } from "./AppRoot";

let patchesHandler: ((batch: { version: number; patches: Array<{ t: string; instrument: unknown }> }) => void) | undefined;

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
	subscribePatches: vi.fn(({ onBatch }: { onBatch: typeof patchesHandler }) => {
		patchesHandler = onBatch ?? undefined;
		return () => {};
	}),
	subscribeAudioDeltas: vi.fn(() => () => {}),
};

vi.mock("../rpc/client", () => ({
	createDawStateClient: vi.fn(() => mockClient),
}));

describe("AppRoot", () => {
	it("renders and handles daw.instrument.create commands", async () => {
		patchesHandler = undefined;

		render(
			<AppProviders>
				<AppRoot />
			</AppProviders>,
		);

		expect(screen.getByText("DAW")).toBeInTheDocument();
		await waitFor(() => expect(patchesHandler).toBeTypeOf("function"));

		patchesHandler?.({
			version: 1,
			patches: [
				{
					t: "instrument.add",
					instrument: { id: "inst-1", type: "synth", name: "Bass" },
				},
			],
		});

		// Instrument should appear in the list.
		expect(await screen.findByText(/synth: Bass/)).toBeInTheDocument();
	});
});

