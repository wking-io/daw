import type { Events, Ids } from "@daw/core";
import { useCallback, useEffect, useRef, useState } from "react";

const port = Number.parseInt(import.meta.env.DAW_STATE_PORT ?? "43125", 10);
const token = import.meta.env.DAW_STATE_TOKEN;
const baseUrl = `http://127.0.0.1:${port}`;

export interface UseSSEOptions {
	/** Project ID to subscribe to */
	projectId: Ids.ProjectId;
	/** Version to start streaming from */
	fromVersion: number;
	/** Callback when an SSE event is received */
	onEvent: (event: Events.EventResponses) => void;
	/** Callback when an error occurs */
	onError?: (error: Error) => void;
	/** Whether the connection should be active */
	enabled?: boolean;
}

export interface UseSSEResult {
	/** Whether the SSE connection is currently connected */
	connected: boolean;
	/** Reconnect the SSE connection */
	reconnect: () => void;
}

/**
 * React hook for SSE subscriptions to a project's event stream.
 *
 * Uses fetch + ReadableStream to allow auth headers (unlike native EventSource).
 */
export function useSSE(options: UseSSEOptions): UseSSEResult {
	const { projectId, fromVersion, onEvent, onError, enabled = true } = options;

	const [connected, setConnected] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);
	const reconnectKeyRef = useRef(0);

	const connect = useCallback(async () => {
		if (!enabled) return;

		// Abort any existing connection
		abortControllerRef.current?.abort();
		const controller = new AbortController();
		abortControllerRef.current = controller;

		const url = new URL(`${baseUrl}/api/projects/${projectId}/subscribe`);
		url.searchParams.set("fromVersion", String(fromVersion));

		const headers: Record<string, string> = {
			accept: "text/event-stream",
		};
		if (token) {
			headers.authorization = `Bearer ${token}`;
		}

		let buffer = "";

		try {
			const response = await fetch(url.toString(), {
				headers,
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new Error(`SSE connection failed: ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("No response body");
			}

			setConnected(true);
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						try {
							const event = JSON.parse(data) as Events.EventResponses;
							onEvent(event);
						} catch {
							// Ignore parse errors
						}
					}
				}
			}
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				// Expected when closing
				return;
			}
			onError?.(error instanceof Error ? error : new Error(String(error)));
		} finally {
			setConnected(false);
		}
	}, [projectId, fromVersion, onEvent, onError, enabled]);

	// Connect effect
	useEffect(() => {
		if (!enabled) return;

		void connect();

		return () => {
			abortControllerRef.current?.abort();
			abortControllerRef.current = null;
		};
	}, [connect, enabled, reconnectKeyRef.current]);

	const reconnect = useCallback(() => {
		reconnectKeyRef.current += 1;
		void connect();
	}, [connect]);

	return { connected, reconnect };
}
