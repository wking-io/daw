import type { Instrument } from "@daw/contract";
import { CreateInstrumentCommand } from "@daw/contract";
import { Effect, Schema } from "effect";
import { useEffect, useMemo, useState } from "react";
import { executeCreateInstrument } from "../daw/commands";
import { useAppServices } from "./AppProviders";

export function AppRoot() {
	const { store, platform } = useAppServices();
	const initial = useMemo(() => store.getState().instruments, [store]);
	const [instruments, setInstruments] =
		useState<ReadonlyArray<Instrument>>(initial);
	const [logs, setLogs] = useState<ReadonlyArray<string>>([]);

	useEffect(() => {
		const unsubscribeStore = store.subscribe((state) => {
			setInstruments(state.instruments);
		});

		const unsubscribePlatform = platform.onCommand((req) => {
			setLogs((l) => [...l, `← ${req.name} ${JSON.stringify(req.payload)}`]);

			if (req.name === "daw.instrument.create") {
				try {
					const cmd = Schema.decodeUnknownSync(CreateInstrumentCommand)(
						req.payload,
					);
					const instrument = Effect.runSync(
						executeCreateInstrument(store, cmd),
					);
					const resultJson = JSON.stringify({ ok: true, instrument });
					void platform.respond(req.requestId, resultJson);
					setLogs((l) => [...l, `→ ok ${instrument.name}`]);
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					const resultJson = JSON.stringify({ ok: false, error: message });
					void platform.respond(req.requestId, resultJson);
					setLogs((l) => [...l, `→ error ${message}`]);
				}
			} else {
				const resultJson = JSON.stringify({
					ok: false,
					error: `Unknown command: ${req.name}`,
				});
				void platform.respond(req.requestId, resultJson);
			}
		});

		return () => {
			unsubscribeStore();
			unsubscribePlatform();
		};
	}, [platform, store]);

	return (
		<div style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
			<h2>DAW</h2>

			<section style={{ margin: "16px 0" }}>
				<h3>Instruments</h3>
				<ul>
					{instruments.map((i) => (
						<li key={i.id}>
							{i.type}: {i.name} ({i.id})
						</li>
					))}
				</ul>
			</section>

			<section style={{ margin: "16px 0" }}>
				<h3>Command log</h3>
				<pre
					style={{
						padding: "12px",
						backgroundColor: "#111",
						color: "#eee",
						borderRadius: "8px",
						overflow: "auto",
					}}
				>
					{logs.join("\n")}
				</pre>
			</section>
		</div>
	);
}
