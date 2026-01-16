import type { Instrument, Project } from "@daw/contract";
import { InstrumentCommands, InstrumentTools } from "@daw/contract";
import type * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext, useAtomValue } from "@effect-atom/atom-react";
import { Schema } from "effect";
import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ulid } from "ulid";
import { encodeCreateInstrumentResultJson } from "../daw/commands";
import { instrumentsAtom, logsAtom } from "../daw/state";
import { isTauriRuntime } from "../ports/Platform";
import { createDawStateClient } from "../rpc/client";
import { useAppServices } from "./AppProviders";

export function AppRoot() {
	const instruments = useAtomValue(instrumentsAtom);
	const logs = useAtomValue(logsAtom);
	const registry = useContext(RegistryContext) as Registry.Registry;
	const { platform } = useAppServices();
	const stateClient = useMemo(() => createDawStateClient(), []);
	const versionRef = useRef(0);
	const snapshotReadyRef = useRef(false);
	const snapshotRetryInFlightRef = useRef(false);
	const gapRecoveryRef = useRef(false);

	const instrumentTypes = useMemo(
		(): ReadonlyArray<Instrument.InstrumentType> => [
			"synth",
			"sampler",
			"drum",
		],
		[],
	);
	const [newInstrumentType, setNewInstrumentType] =
		useState<Instrument.InstrumentType>("synth");
	const [newInstrumentName, setNewInstrumentName] = useState("Bass");
	const [isCreating, setIsCreating] = useState(false);
	const clientId = useMemo(() => {
		if (typeof window === "undefined") return ulid();
		const storageKey = "daw.clientId";
		try {
			const existing = window.localStorage.getItem(storageKey);
			if (existing) return existing;
			const next = ulid();
			window.localStorage.setItem(storageKey, next);
			return next;
		} catch {
			return ulid();
		}
	}, []);

	useEffect(() => {
		// #region agent log
		fetch("http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "packages/app/src/app/AppRoot.tsx:env",
				message: "ui.env",
				data: {
					origin:
						typeof window !== "undefined" ? window.location.origin : "unknown",
					isTauri: isTauriRuntime(),
					userAgent:
						typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
				},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "pre-fix",
				hypothesisId: "H15",
			}),
		}).catch(() => {});
		// #endregion agent log
	}, []);

	const canCreate = useMemo(
		() =>
			newInstrumentType.trim().length > 0 &&
			newInstrumentName.trim().length > 0,
		[newInstrumentType, newInstrumentName],
	);

	const applySubmit = useCallback(
		(submit: Project.Submit) => {
			if (submit.op.t !== "instrument.create") return;
			const instrumentId =
				submit.op.instrumentId ?? (ulid() as Instrument.InstrumentId);
			const createdAtMs =
				typeof submit.op.createdAt === "number"
					? submit.op.createdAt
					: Date.now();
			const instrument: Instrument.Instrument = {
				id: instrumentId,
				type: submit.op.type,
				name: submit.op.name,
				params: {},
				createdAt: new Date(createdAtMs),
			};
			registry.update(
				instrumentsAtom,
				(prev: ReadonlyArray<Instrument.Instrument>) => [...prev, instrument],
			);
		},
		[registry],
	);

	const recoverFromGap = useCallback(
		async (trigger: string) => {
			if (gapRecoveryRef.current) return;
			gapRecoveryRef.current = true;
			try {
				const response = await stateClient.getOps(versionRef.current);
				let expectedVersion = versionRef.current;
				for (const entry of response.ops) {
					if (entry.version !== expectedVersion + 1) break;
					applySubmit(entry.submit);
					expectedVersion = entry.version;
					versionRef.current = expectedVersion;
				}

				const lastEntry = response.ops[response.ops.length - 1];
				if (!lastEntry || lastEntry.version !== versionRef.current) {
					const snapshot = await stateClient.getSnapshot();
					versionRef.current = snapshot.version;
					registry.update(instrumentsAtom, () => snapshot.doc.instruments);
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`← (state) gap recovery snapshot (${trigger})`,
					]);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				registry.update(logsAtom, (l: ReadonlyArray<string>) => [
					...l,
					`← (state) gap recovery error ${message}`,
				]);
			} finally {
				gapRecoveryRef.current = false;
			}
		},
		[applySubmit, registry, stateClient],
	);

	const applyOpEntry = useCallback(
		(entry: Project.OpEntry) => {
			if (entry.version <= versionRef.current) return;
			if (entry.version !== versionRef.current + 1) {
				void recoverFromGap(`ws:${entry.version}`);
				return;
			}
			versionRef.current = entry.version;
			applySubmit(entry.submit);
		},
		[applySubmit, recoverFromGap],
	);

	const applyPatchBatch = useCallback(
		(batch: Project.PatchBatch) => {
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/app/src/app/AppRoot.tsx:applyPatchBatch",
						message: "ui.applyPatchBatch.entry",
						data: {
							batchVersion: batch.version,
							patchCount: batch.patches.length,
							currentVersion: versionRef.current,
						},
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H5",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			if (batch.version <= versionRef.current) return;
			versionRef.current = batch.version;
			registry.update(
				instrumentsAtom,
				(prev: ReadonlyArray<Instrument.Instrument>) => {
					let next = prev;
					for (const patch of batch.patches) {
						if (patch.t === "instrument.add") {
							next = [...next, patch.instrument];
						}
					}
					return next;
				},
			);
		},
		[registry],
	);

	useEffect(() => {
		// #region agent log
		fetch("http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "packages/app/src/app/AppRoot.tsx:stateEffect",
				message: "ui.stateEffect.start",
				data: {},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "pre-fix",
				hypothesisId: "H9",
			}),
		}).catch(() => {});
		// #endregion agent log
		let disconnectOps = () => {};
		let cancelled = false;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let reconnectAttempts = 0;

		const scheduleReconnect = (reason: string) => {
			if (cancelled || reconnectTimer) return;
			reconnectAttempts += 1;
			const delay = Math.min(1000 * reconnectAttempts, 5000);
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				connectOps(versionRef.current);
			}, delay);
			registry.update(logsAtom, (l: ReadonlyArray<string>) => [
				...l,
				`← (state) ws reconnect in ${delay}ms (${reason})`,
			]);
		};

		const connectOps = (fromVersion: number) => {
			disconnectOps();
			disconnectOps = stateClient.connectOps({
				fromVersion,
				clientId,
				onOp: applyOpEntry,
				onPresence: (clients) => {
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`← (presence) ${clients.length} online`,
					]);
				},
				onLocks: (locks) => {
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`← (locks) ${locks.length} active`,
					]);
				},
				onError: (error) => {
					const message =
						error instanceof Error ? error.message : String(error);
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`← (state) ws error ${message}`,
					]);
				},
				onClose: () => {
					scheduleReconnect("close");
				},
			});
		};

		const applySnapshot = (snapshot: Project.Snapshot) => {
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/app/src/app/AppRoot.tsx:stateEffect",
						message: "ui.stateEffect.snapshot.success",
						data: { version: snapshot.version, cancelled },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H9",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			if (cancelled) return;
			snapshotReadyRef.current = true;
			versionRef.current = snapshot.version;
			registry.update(instrumentsAtom, () => snapshot.doc.instruments);
			reconnectAttempts = 0;
			connectOps(snapshot.version);
		};

		const attemptSnapshot = (trigger: string) => {
			if (snapshotReadyRef.current || snapshotRetryInFlightRef.current) return;
			snapshotRetryInFlightRef.current = true;
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/app/src/app/AppRoot.tsx:stateEffect",
						message: "ui.stateEffect.snapshot.retry.start",
						data: { trigger },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H12",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			void stateClient
				.getSnapshot()
				.then((snapshot) => {
					snapshotRetryInFlightRef.current = false;
					applySnapshot(snapshot);
				})
				.catch(() => {
					snapshotRetryInFlightRef.current = false;
				});
		};

		void stateClient
			.getSnapshot()
			.then(applySnapshot)
			.catch((err) => {
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/app/src/app/AppRoot.tsx:stateEffect",
							message: "ui.stateEffect.snapshot.error",
							data: { error: String(err) },
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H9",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				attemptSnapshot("snapshot.error");
				scheduleReconnect("snapshot.error");
				const message = err instanceof Error ? err.message : String(err);
				registry.update(logsAtom, (l: ReadonlyArray<string>) => [
					...l,
					`← (state) snapshot error ${message}`,
				]);
			});

		return () => {
			cancelled = true;
			disconnectOps();
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
			}
		};
	}, [applyOpEntry, clientId, registry, stateClient]);

	useEffect(() => {
		const unsubscribe = platform.onCommand((req) => {
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/app/src/app/AppRoot.tsx:onCommand",
						message: "ui.onCommand.received",
						data: { name: req.name, requestId: req.requestId },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H6",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			if (req.name !== InstrumentTools.CreateName) return;
			const handle = async () => {
				let command: InstrumentCommands.CreateCommand;
				try {
					command = Schema.decodeUnknownSync(InstrumentCommands.CreateCommand)(
						req.payload,
					);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`← (agent) error ${message}`,
					]);
					await platform.respond(
						req.requestId,
						encodeCreateInstrumentResultJson({ ok: false, error: message }),
					);
					return;
				}

				registry.update(logsAtom, (l: ReadonlyArray<string>) => [
					...l,
					`→ (agent) submit instrument.create ${JSON.stringify({
						type: command.type,
						name: command.name.trim(),
					})}`,
				]);

				const instrumentId = ulid() as Instrument.InstrumentId;
				const createdAt = Date.now();
				const submit: Project.Submit = {
					opId: ulid(),
					baseVersion: versionRef.current,
					actor: "agent",
					op: {
						t: "instrument.create",
						type: command.type,
						name: command.name.trim(),
						preset: command.preset,
						instrumentId,
						createdAt,
					},
				};

				try {
					const result = await stateClient.submitOp(submit);
					const created = result.patches.patches.find(
						(patch) => patch.t === "instrument.add",
					);
					if (!created) {
						throw new Error(
							"submitOp succeeded but no instrument.add patch returned",
						);
					}
					applyPatchBatch(result.patches);
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`← (agent) ok ${created.instrument.name} (${created.instrument.id})`,
					]);
					await platform.respond(
						req.requestId,
						encodeCreateInstrumentResultJson({
							ok: true,
							instrument: created.instrument,
						}),
					);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					registry.update(logsAtom, (l: ReadonlyArray<string>) => [
						...l,
						`← (agent) error ${message}`,
					]);
					await platform.respond(
						req.requestId,
						encodeCreateInstrumentResultJson({ ok: false, error: message }),
					);
				}
			};
			void handle();
		});

		return unsubscribe;
	}, [applyPatchBatch, platform, registry, stateClient]);

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

							const instrumentId = ulid() as Instrument.InstrumentId;
							const createdAt = Date.now();
							const submit: Project.Submit = {
								opId: ulid(),
								baseVersion: versionRef.current,
								actor: "ui",
								op: {
									t: "instrument.create",
									type: newInstrumentType,
									name: newInstrumentName.trim(),
									instrumentId,
									createdAt,
								},
							};

							void stateClient
								.submitOp(submit)
								.then((result) => {
									applyPatchBatch(result.patches);
									const created = result.patches.patches.find(
										(patch) => patch.t === "instrument.add",
									);
									if (created) {
										registry.update(logsAtom, (l: ReadonlyArray<string>) => [
											...l,
											`← (ui) ok ${created.instrument.name} (${created.instrument.id})`,
										]);
									}
								})
								.catch((err) => {
									const message =
										err instanceof Error ? err.message : String(err);
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
					This submits an op to the Bun sidecar and listens for ops over a
					WebSocket.
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
