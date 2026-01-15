import { Project } from "@daw/contract";
import { Schema } from "effect";

export interface DawStateClientOptions {
	host?: string;
	port?: number;
}

export interface DawStateClient {
	getSnapshot: () => Promise<Project.Snapshot>;
	submitOp: (submit: Project.Submit) => Promise<Project.SubmitResult>;
	subscribePatches: (options: {
		fromVersion: number;
		onBatch: (batch: Project.PatchBatch) => void;
		onError?: (error: Event) => void;
	}) => () => void;
	subscribeAudioDeltas: (options: {
		fromVersion: number;
		onBatch: (batch: Project.AudioDeltaBatch) => void;
		onError?: (error: Event) => void;
	}) => () => void;
}

const decodeSnapshot = Schema.decodeUnknownSync(Project.Snapshot);
const decodeSubmitResult = Schema.decodeUnknownSync(Project.SubmitResult);
const decodePatchBatch = Schema.decodeUnknownSync(Project.PatchBatch);
const decodeAudioDeltaBatch = Schema.decodeUnknownSync(Project.AudioDeltaBatch);

const defaultPort = Number.parseInt(import.meta.env.VITE_DAW_STATE_PORT ?? "43125", 10);

const resolveBaseUrl = (options?: DawStateClientOptions) => {
	const host = options?.host ?? "127.0.0.1";
	const port = options?.port ?? defaultPort;
	return `http://${host}:${port}`;
};

export const createDawStateClient = (
	options?: DawStateClientOptions,
): DawStateClient => {
	const baseUrl = resolveBaseUrl(options);

	return {
		getSnapshot: async () => {
			const res = await fetch(`${baseUrl}/snapshot`);
			if (!res.ok) {
				throw new Error(`snapshot failed: ${res.status} ${res.statusText}`);
			}
			const json = await res.json();
			return decodeSnapshot(json);
		},
		submitOp: async (submit) => {
			const res = await fetch(`${baseUrl}/submitOp`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(submit),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text.length > 0 ? text : `submit failed: ${res.status}`);
			}
			const json = await res.json();
			return decodeSubmitResult(json);
		},
		subscribePatches: ({ fromVersion, onBatch, onError }) => {
			const source = new EventSource(
				`${baseUrl}/patches?fromVersion=${encodeURIComponent(String(fromVersion))}`,
			);
			source.addEventListener("patches", (event) => {
				const parsed = decodePatchBatch(JSON.parse((event as MessageEvent).data));
				onBatch(parsed);
			});
			source.onerror = (event) => {
				onError?.(event);
			};
			return () => source.close();
		},
		subscribeAudioDeltas: ({ fromVersion, onBatch, onError }) => {
			const source = new EventSource(
				`${baseUrl}/audio-deltas?fromVersion=${encodeURIComponent(String(fromVersion))}`,
			);
			source.addEventListener("audio-deltas", (event) => {
				const parsed = decodeAudioDeltaBatch(JSON.parse((event as MessageEvent).data));
				onBatch(parsed);
			});
			source.onerror = (event) => {
				onError?.(event);
			};
			return () => source.close();
		},
	};
};
