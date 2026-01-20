import type {
	Commands,
	Domain,
	Events,
	ProjectId,
	SSE,
	TrackId,
} from "@daw/contract";
import type * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext, useAtomValue } from "@effect-atom/atom-react";
import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ulid } from "ulid";
import { connectedAtom, readyAtom } from "../events/atoms";
import {
	applyPatchBatchWithRegistry,
	applySnapshotWithRegistry,
	handleSSEEventWithRegistry,
	versionAtom,
} from "../events/handlers";
import { createDawStateClient, type DawStateClient } from "../http/client";
import { snapshotAtom } from "../instruments/atoms";
import { logsAtom } from "../logs/atoms";
import * as Logs from "../logs/handlers";
import type { ServerInfo } from "../ports/Platform";
import { useAppServices } from "./AppProviders";

export function AppRoot() {
	const snapshot = useAtomValue(snapshotAtom);
	const logs = useAtomValue(logsAtom);
	const serverReady = useAtomValue(readyAtom);
	const sseConnected = useAtomValue(connectedAtom);
	const currentVersion = useAtomValue(versionAtom);
	const registry = useContext(RegistryContext) as Registry.Registry;
	const { platform } = useAppServices();
	const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
	const versionRef = useRef(0);

	// For demo: hardcoded project ID (in real app, would be selected from project list)
	const [projectId] = useState<ProjectId>("demo-project" as ProjectId);

	const trackTypes = useMemo(
		(): ReadonlyArray<Domain.TrackType> => ["midi", "audio", "bus"],
		[],
	);
	const [newTrackType, setNewTrackType] = useState<Domain.TrackType>("midi");
	const [newTrackName, setNewTrackName] = useState("Bass");
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
		registry.set(readyAtom, false);

		const waitForHealth = async () => {
			let attempt = 0;
			while (!cancelled) {
				try {
					const health = await stateClient.getHealth();
					if (health.healthy) {
						registry.set(readyAtom, true);
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
		() => newTrackType.trim().length > 0 && newTrackName.trim().length > 0,
		[newTrackType, newTrackName],
	);

	// Gap recovery
	const recoverFromGap = useCallback(
		async (trigger: string) => {
			if (!stateClient) return;
			try {
				const response = await stateClient.getEvents(
					projectId,
					versionRef.current,
				);
				let expectedVersion = versionRef.current;
				for (const batch of response.events) {
					if (batch.version !== expectedVersion + 1) break;
					// TODO: Apply events to local state
					expectedVersion = batch.version;
					versionRef.current = expectedVersion;
				}

				const lastBatch = response.events[response.events.length - 1];
				if (!lastBatch || lastBatch.version !== versionRef.current) {
					const snapshot = await stateClient.getSnapshot(projectId);
					versionRef.current = snapshot.version;
					applySnapshotWithRegistry(registry, snapshot);
					Logs.push(registry, `← (state) gap recovery snapshot (${trigger})`);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				Logs.push(registry, `← (state) gap recovery error ${message}`);
			}
		},
		[stateClient, registry, projectId],
	);

	// SSE connection effect - uses callback-based approach
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
			Logs.push(registry, `← (sse) reconnect in ${delay}ms (${reason})`);
		};

		const connectSSE = (fromVersion: number) => {
			disconnectSSE();
			registry.set(connectedAtom, false);

			disconnectSSE = stateClient.connectSSE({
				projectId,
				fromVersion,
				onEvent: (event: SSE.SSEEvent) => {
					handleSSEEventWithRegistry(
						registry,
						event,
						versionRef,
						recoverFromGap,
					);
				},
				onError: (error) => {
					Logs.push(registry, `← (sse) error ${error.message}`);
					scheduleReconnect("error");
				},
				onClose: () => {
					registry.set(connectedAtom, false);
					scheduleReconnect("close");
				},
			});
			reconnectAttempts = 0;
		};

		const initializeState = async () => {
			try {
				const snapshot = await stateClient.getSnapshot(projectId);
				if (cancelled) return;
				versionRef.current = snapshot.version;
				applySnapshotWithRegistry(registry, snapshot);
				Logs.push(
					registry,
					`← (state) snapshot v${snapshot.version} with ${snapshot.tracks.length} tracks`,
				);
				connectSSE(snapshot.version);
			} catch (err) {
				if (cancelled) return;
				const message = err instanceof Error ? err.message : String(err);
				Logs.push(registry, `← (state) snapshot error ${message}`);
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
	}, [stateClient, serverReady, recoverFromGap, registry, projectId]);

	// Handle UI create button
	const handleCreate = async () => {
		if (!canCreate || !stateClient) return;
		setIsCreating(true);

		Logs.push(
			registry,
			`→ (ui) submit track.create ${JSON.stringify({
				type: newTrackType,
				name: newTrackName.trim(),
			})}`,
		);

		const trackId = ulid() as TrackId;
		const command: Commands.Command = {
			commandId: ulid(),
			expectedVersion: versionRef.current,
			actor: "ui",
			payload: {
				t: "track.create",
				type: newTrackType,
				name: newTrackName.trim(),
			},
		};

		try {
			const result = await stateClient.executeCommand(projectId, command);
			versionRef.current = applyPatchBatchWithRegistry(
				registry,
				result.events,
				versionRef.current,
			);
			const created = result.events.events.find(
				(event) => event.t === "track.created",
			);
			if (created && created.t === "track.created") {
				Logs.push(
					registry,
					`← (ui) ok ${created.track.name} (${created.track.id})`,
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			Logs.push(registry, `← (ui) error ${message}`);
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

	const tracks = snapshot?.tracks ?? [];

	return (
		<div style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
			<h2>DAW</h2>

			<section style={{ margin: "16px 0" }}>
				<h3>Create track</h3>
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
						<span>Type</span>
						<select
							value={newTrackType}
							onChange={(e) => {
								const next = e.target.value as Domain.TrackType;
								if (trackTypes.includes(next)) setNewTrackType(next);
							}}
							disabled={isCreating}
						>
							{trackTypes.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
					</label>
					<label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
						<span>Name</span>
						<input
							value={newTrackName}
							onChange={(e) => setNewTrackName(e.target.value)}
							disabled={isCreating}
							style={{ width: "220px" }}
						/>
					</label>
					<button
						type="button"
						disabled={!canCreate || isCreating}
						onClick={handleCreate}
					>
						{isCreating ? "Creating..." : "Create"}
					</button>
				</div>
				<p style={{ margin: "8px 0 0", opacity: 0.7 }}>
					This submits an op to the Bun sidecar and listens for updates over
					SSE.
				</p>
			</section>

			<section style={{ margin: "16px 0" }}>
				<h3>
					Tracks{" "}
					<span style={{ fontSize: "0.8em", opacity: 0.7 }}>
						(v{currentVersion}, SSE: {sseConnected ? "connected" : "..."})
					</span>
				</h3>
				<ul>
					{tracks.map((track) => (
						<li key={track.id}>
							{track.type}: {track.name} ({track.id})
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
