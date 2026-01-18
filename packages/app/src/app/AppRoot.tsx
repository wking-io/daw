import type { Events, Instrument, Project } from "@daw/contract";
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
import {
	addLog,
	applyPatchBatch,
	applySnapshot,
	applySubmit,
	handleSSEEvent,
	instrumentsAtom,
	logsAtom,
	serverReadyAtom,
	sseConnectedAtom,
	versionAtom,
} from "../daw/atoms";
import { encodeCreateInstrumentResultJson } from "../daw/commands";
import { createDawStateClient, type DawStateClient } from "../http/client";
import type { ServerInfo } from "../ports/Platform";
import { useAppServices } from "./AppProviders";

export function AppRoot() {
	const instruments = useAtomValue(instrumentsAtom);
	const logs = useAtomValue(logsAtom);
	const serverReady = useAtomValue(serverReadyAtom);
	const sseConnected = useAtomValue(sseConnectedAtom);
	const currentVersion = useAtomValue(versionAtom);
	const registry = useContext(RegistryContext) as Registry.Registry;
	const { platform } = useAppServices();
	const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
	const versionRef = useRef(0);
	const snapshotReadyRef = useRef(false);
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

	// Create the DAW state client when server info is available
	const stateClient = useMemo<DawStateClient | null>(() => {
		if (!serverInfo) return null;
		return createDawStateClient({
			baseUrl: serverInfo.baseUrl,
			token: serverInfo.token,
		});
	}, [serverInfo]);

	// Load server info from platform
	useEffect(() => {
		let cancelled = false;
		const loadServerInfo = async () => {
			try {
				if (platform.getServerInfo) {
					const info = await platform.getServerInfo();
					if (!cancelled) setServerInfo(info);
				} else {
					setServerInfo({});
				}
			} catch {
				if (!cancelled) setServerInfo({});
			}
		};
		loadServerInfo();
		return () => {
			cancelled = true;
		};
	}, [platform]);

	// Health check to wait for server readiness
	useEffect(() => {
		if (!stateClient) return;
		let cancelled = false;
		registry.update(serverReadyAtom, () => false);

		const waitForHealth = async () => {
			let attempt = 0;
			while (!cancelled) {
				try {
					const health = await stateClient.getHealth();
					if (health.healthy) {
						registry.update(serverReadyAtom, () => true);
						return;
					}
				} catch {
					// Ignore and retry
				}
				attempt += 1;
				const delay = Math.min(1000 * attempt, 5000);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		};
		waitForHealth();
		return () => {
			cancelled = true;
		};
	}, [stateClient, registry]);

	const canCreate = useMemo(
		() =>
			newInstrumentType.trim().length > 0 &&
			newInstrumentName.trim().length > 0,
		[newInstrumentType, newInstrumentName],
	);

	// Gap recovery
	const recoverFromGap = useCallback(
		async (trigger: string) => {
			if (!stateClient) return;
			if (gapRecoveryRef.current) return;
			gapRecoveryRef.current = true;
			try {
				const response = await stateClient.getOps(versionRef.current);
				let expectedVersion = versionRef.current;
				for (const entry of response.operations) {
					if (entry.version !== expectedVersion + 1) break;
					applySubmit(
						registry,
						entry.submit,
						entry.submit.op.instrumentId as Instrument.InstrumentId,
					);
					expectedVersion = entry.version;
					versionRef.current = expectedVersion;
				}

				const lastEntry = response.operations[response.operations.length - 1];
				if (!lastEntry || lastEntry.version !== versionRef.current) {
					const snapshot = await stateClient.getSnapshot();
					versionRef.current = snapshot.version;
					applySnapshot(registry, snapshot);
					addLog(registry, `← (state) gap recovery snapshot (${trigger})`);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				addLog(registry, `← (state) gap recovery error ${message}`);
			} finally {
				gapRecoveryRef.current = false;
			}
		},
		[stateClient, registry],
	);

	// SSE connection effect - replaces WebSocket
	useEffect(() => {
		if (!stateClient || !serverReady) return;
		let disconnectSSE = () => {};
		let cancelled = false;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let reconnectAttempts = 0;

		const scheduleReconnect = (reason: string) => {
			if (cancelled || reconnectTimer) return;
			reconnectAttempts += 1;
			const delay = Math.min(1000 * reconnectAttempts, 5000);
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				connectSSE(versionRef.current);
			}, delay);
			addLog(registry, `← (sse) reconnect in ${delay}ms (${reason})`);
		};

		const connectSSE = (fromVersion: number) => {
			disconnectSSE();
			registry.update(sseConnectedAtom, () => false);

			disconnectSSE = stateClient.connectSSE({
				fromVersion,
				onEvent: (event: Events.Event) => {
					handleSSEEvent(registry, event, versionRef, recoverFromGap);
				},
				onError: (error) => {
					addLog(registry, `← (sse) error ${error.message}`);
					scheduleReconnect("error");
				},
				onClose: () => {
					registry.update(sseConnectedAtom, () => false);
					scheduleReconnect("close");
				},
			});
			reconnectAttempts = 0;
		};

		const initializeState = async () => {
			try {
				const snapshot = await stateClient.getSnapshot();
				if (cancelled) return;
				snapshotReadyRef.current = true;
				versionRef.current = snapshot.version;
				applySnapshot(registry, snapshot);
				addLog(
					registry,
					`← (state) snapshot v${snapshot.version} with ${snapshot.doc.instruments.length} instruments`,
				);
				connectSSE(snapshot.version);
			} catch (err) {
				if (cancelled) return;
				const message = err instanceof Error ? err.message : String(err);
				addLog(registry, `← (state) snapshot error ${message}`);
				scheduleReconnect("snapshot.error");
			}
		};

		initializeState();

		return () => {
			cancelled = true;
			disconnectSSE();
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
			}
		};
	}, [stateClient, serverReady, recoverFromGap, registry]);

	// Handle platform commands (from desktop IPC)
	useEffect(() => {
		if (!stateClient || !serverReady) return;
		const unsubscribe = platform.onCommand((req) => {
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
					addLog(registry, `← (agent) error ${message}`);
					await platform.respond(
						req.requestId,
						encodeCreateInstrumentResultJson({ ok: false, error: message }),
					);
					return;
				}

				addLog(
					registry,
					`→ (agent) submit instrument.create ${JSON.stringify({
						type: command.type,
						name: command.name.trim(),
					})}`,
				);

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
					versionRef.current = applyPatchBatch(
						registry,
						result.patches,
						versionRef.current,
					);
					addLog(
						registry,
						`← (agent) ok ${created.instrument.name} (${created.instrument.id})`,
					);
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
					addLog(registry, `← (agent) error ${message}`);
					await platform.respond(
						req.requestId,
						encodeCreateInstrumentResultJson({ ok: false, error: message }),
					);
				}
			};
			void handle();
		});

		return unsubscribe;
	}, [stateClient, serverReady, platform, registry]);

	// Handle UI create button
	const handleCreate = async () => {
		if (!canCreate || !stateClient) return;
		setIsCreating(true);

		addLog(
			registry,
			`→ (ui) submit instrument.create ${JSON.stringify({
				type: newInstrumentType,
				name: newInstrumentName.trim(),
			})}`,
		);

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

		try {
			const result = await stateClient.submitOp(submit);
			versionRef.current = applyPatchBatch(
				registry,
				result.patches,
				versionRef.current,
			);
			const created = result.patches.patches.find(
				(patch) => patch.t === "instrument.add",
			);
			if (created) {
				addLog(
					registry,
					`← (ui) ok ${created.instrument.name} (${created.instrument.id})`,
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			addLog(registry, `← (ui) error ${message}`);
		} finally {
			setIsCreating(false);
		}
	};

	if (!serverReady) {
		return (
			<div style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
				<h2>DAW</h2>
				<p>Starting server...</p>
			</div>
		);
	}

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
						onClick={handleCreate}
					>
						{isCreating ? "Creating…" : "Create"}
					</button>
				</div>
				<p style={{ margin: "8px 0 0", opacity: 0.7 }}>
					This submits an op to the Bun sidecar and listens for updates over
					SSE.
				</p>
			</section>

			<section style={{ margin: "16px 0" }}>
				<h3>
					Instruments{" "}
					<span style={{ fontSize: "0.8em", opacity: 0.7 }}>
						(v{currentVersion}, SSE: {sseConnected ? "✓" : "…"})
					</span>
				</h3>
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
