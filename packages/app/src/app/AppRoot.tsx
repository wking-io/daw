import { CreateInstrumentCommand } from "@daw/contract";
import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext, useAtomValue } from "@effect-atom/atom-react";
import { Effect, Schema } from "effect";
import { useContext, useEffect } from "react";
import {
	encodeCreateInstrumentResultJson,
	executeCreateInstrument,
} from "../daw/commands";
import { instrumentsAtom, logsAtom } from "../daw/state";
import { useAppServices } from "./AppProviders";

export function AppRoot() {
	const { platform } = useAppServices();
	const instruments = useAtomValue(instrumentsAtom);
	const logs = useAtomValue(logsAtom);
	const registry = useContext(RegistryContext) as Registry.Registry;

	useEffect(() => {
		const unsubscribePlatform = platform.onCommand((req) => {
			registry.update(logsAtom, (l: ReadonlyArray<string>) => [
				...l,
				`← ${req.name} ${JSON.stringify(req.payload)}`,
			]);

			if (req.name === "daw.instrument.create") {
				try {
					const cmd = Schema.decodeUnknownSync(CreateInstrumentCommand)(
						req.payload,
					);
					const instrument = Effect.runSync(
						executeCreateInstrument(cmd).pipe(
							Effect.provideService(Registry.AtomRegistry, registry),
						),
					);
					const resultJson = encodeCreateInstrumentResultJson({
						ok: true,
						instrument,
					});
					void platform.respond(req.requestId, resultJson);
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`→ ok ${instrument.name}`,
					]);
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					const resultJson = encodeCreateInstrumentResultJson({
						ok: false,
						error: message,
					});
					void platform.respond(req.requestId, resultJson);
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`→ error ${message}`,
					]);
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
			unsubscribePlatform();
		};
	}, [platform, registry]);

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
