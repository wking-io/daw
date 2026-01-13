import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "./AppProviders";
import { AppRoot } from "./AppRoot";
import type { DawCommandRequest, Platform } from "../ports/Platform";

describe("AppRoot", () => {
	it("renders and handles daw.instrument.create commands", async () => {
		let handler: ((req: DawCommandRequest) => void) | undefined;

		const platform: Platform = {
			onCommand: (h) => {
				handler = h;
				return () => {
					handler = undefined;
				};
			},
			respond: vi.fn(async () => {}),
		};

		render(
			<AppProviders platform={platform}>
				<AppRoot />
			</AppProviders>,
		);

		expect(screen.getByText("DAW")).toBeInTheDocument();
		expect(handler).toBeTypeOf("function");

		handler?.({
			requestId: "req-1",
			name: "daw.instrument.create",
			payload: { type: "synth", name: "Bass" },
		});

		// Instrument should appear in the list.
		expect(await screen.findByText(/synth: Bass/)).toBeInTheDocument();
	});
});

