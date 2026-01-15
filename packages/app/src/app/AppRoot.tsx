import type { Instrument } from "@daw/contract";
import { Project } from "@daw/contract";
import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext, useAtomValue } from "@effect-atom/atom-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ulid } from "ulid";
import { instrumentsAtom, logsAtom } from "../daw/state";
import { createDawStateClient } from "../rpc/client";
import { sendAudioDeltasToWorklet, type WorkletPort } from "../audio/worklet-bridge";

export function AppRoot() {
	const instruments = useAtomValue(instrumentsAtom);
	const logs = useAtomValue(logsAtom);
	const registry = useContext(RegistryContext) as Registry.Registry;
	const stateClient = useMemo(() => createDawStateClient(), []);
	const versionRef = useRef(0);
	const workletPortRef = useRef<WorkletPort | null>(null);

	const instrumentTypes = useMemo(
		(): ReadonlyArray<Instrument.InstrumentType> => ["synth", "sampler", "drum"],
		[],
	);
	const [newInstrumentType, setNewInstrumentType] =
		useState<Instrument.InstrumentType>("synth");
	const [newInstrumentName, setNewInstrumentName] = useState("Bass");
	const [isCreating, setIsCreating] = useState(false);

	const canCreate = useMemo(
		() => newInstrumentType.trim().length > 0 && newInstrumentName.trim().length > 0,
		[newInstrumentType, newInstrumentName],
	);

	useEffect(() => {
		let unsubscribe = () => {};
		let unsubscribeAudio = () => {};
		let cancelled = false;

		const applyPatches = (batch: Project.PatchBatch) => {
			if (batch.version <= versionRef.current) return;
			versionRef.current = batch.version;
			for (const patch of batch.patches) {
				if (patch.t === "instrument.add") {
					registry.update(instrumentsAtom, (prev: ReadonlyArray<Instrument.Instrument>) => [
						...prev,
						patch.instrument,
					]);
				}
			}
		};

		void stateClient
			.getSnapshot()
			.then((snapshot) => {
				if (cancelled) return;
				versionRef.current = snapshot.version;
				registry.update(instrumentsAtom, () => snapshot.doc.instruments);
				unsubscribe = stateClient.subscribePatches({
					fromVersion: snapshot.version,
					onBatch: applyPatches,
					onError: (event) => {
						registry.update(logsAtom, (l: ReadonlyArray<string>) => [
							...l,
							`← (state) patches error ${String(event.type)}`,
						]);
					},
				});
				unsubscribeAudio = stateClient.subscribeAudioDeltas({
					fromVersion: snapshot.version,
					onBatch: (batch) => {
						if (!workletPortRef.current) return;
						sendAudioDeltasToWorklet(workletPortRef.current, batch);
					},
					onError: (event) => {
						registry.update(logsAtom, (l: ReadonlyArray<string>) => [
							...l,
							`← (state) audio error ${String(event.type)}`,
						]);
					},
				});
			})
			.catch((err) => {
				const message = err instanceof Error ? err.message : String(err);
				registry.update(logsAtom, (l: ReadonlyArray<string>) => [
					...l,
					`← (state) snapshot error ${message}`,
				]);
			});

		return () => {
			cancelled = true;
			unsubscribe();
			unsubscribeAudio();
		};
	}, [registry, stateClient]);

	return (
		<div style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
			<h2>DAW</h2>

			<section style={{ margin: "16px 0" }}>
				<h3>Create instrument (UI → tool call)</h3>
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
						<span>Type</span>
						<select
							value={newInstrumentType}
							onChange={(e) => {
								const next = e.target.value as Instrument.InstrumentType;
								if (instrumentTypes.includes(next)) setNewInstrumentType(next);
							}}
							disabled={isCreating}
						>
							{instrumentTypes.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
					</label>
					<label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
						<span>Name</span>
						<input
							value={newInstrumentName}
							onChange={(e) => setNewInstrumentName(e.target.value)}
							disabled={isCreating}
							style={{ width: "220px" }}
						/>
					</label>
					<button
						type="button"
						disabled={!canCreate || isCreating}
						onClick={() => {
							if (!canCreate) return;
							setIsCreating(true);

							registry.update(logsAtom, (l: ReadonlyArray<string>) => [
								...l,
								`→ (ui) submit instrument.create ${JSON.stringify({
									type: newInstrumentType,
									name: newInstrumentName.trim(),
								})}`,
							]);

							const submit: Project.Submit = {
								opId: ulid(),
								baseVersion: versionRef.current,
								actor: "ui",
								op: {
									t: "instrument.create",
									type: newInstrumentType,
									name: newInstrumentName.trim(),
								},
							};

							void stateClient
								.submitOp(submit)
								.then((result) => {
									versionRef.current = result.version;
									for (const patch of result.patches.patches) {
										if (patch.t === "instrument.add") {
											registry.update(
												instrumentsAtom,
												(prev: ReadonlyArray<Instrument.Instrument>) => [
													...prev,
													patch.instrument,
												],
											);
											registry.update(logsAtom, (l: ReadonlyArray<string>) => [
												...l,
												`← (ui) ok ${patch.instrument.name} (${patch.instrument.id})`,
											]);
										}
									}
								})
								.catch((err) => {
									const message = err instanceof Error ? err.message : String(err);
									registry.update(logsAtom, (l: ReadonlyArray<string>) => [
										...l,
										`← (ui) error ${message}`,
									]);
								})
								.finally(() => setIsCreating(false));
						}}
					>
						{isCreating ? "Creating…" : "Create"}
					</button>
				</div>
				<p style={{ margin: "8px 0 0", opacity: 0.7 }}>
					This submits an op to the Bun sidecar and listens for patches over SSE.
				</p>
			</section>

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
