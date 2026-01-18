import type { Events } from "@daw/contract";

export interface SSEClientOptions {
	baseUrl: string;
	token?: string;
	fromVersion?: number;
	onEvent: (event: Events.Event) => void;
	onError?: (error: Error) => void;
	onClose?: () => void;
}

/**
 * SSE client using fetch + ReadableStream.
 * This allows attaching auth headers (unlike native EventSource).
 */
export function createSSEClient(options: SSEClientOptions): () => void {
	const {
		baseUrl,
		token,
		fromVersion = 0,
		onEvent,
		onError,
		onClose,
	} = options;
	const controller = new AbortController();

	const url = new URL(`${baseUrl}/api/events`);
	url.searchParams.set("fromVersion", String(fromVersion));
	if (token) {
		url.searchParams.set("token", token);
	}

	const headers: Record<string, string> = {
		accept: "text/event-stream",
	};
	if (token) {
		headers.authorization = `Bearer ${token}`;
	}

	let buffer = "";

	const connect = async () => {
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
							const event = JSON.parse(data) as Events.Event;
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
			onClose?.();
		}
	};

	void connect();

	return () => {
		controller.abort();
	};
}

/**
 * Event coalescing utility.
 * Batches high-frequency events and emits them in batches.
 */
export interface CoalescingOptions<T> {
	/** Function to generate a coalescing key for an event */
	getKey: (event: T) => string | undefined;
	/** Callback when batch is flushed */
	onFlush: (events: T[]) => void;
	/** Batch interval in ms (default: 16ms for ~60fps) */
	intervalMs?: number;
}

export function createEventCoalescer<T>(options: CoalescingOptions<T>) {
	const { getKey, onFlush, intervalMs = 16 } = options;

	let queue: Array<T | undefined> = [];
	const coalesced = new Map<string, number>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastFlush = 0;

	const flush = () => {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}

		const events = queue.filter((e): e is T => e !== undefined);
		queue = [];
		coalesced.clear();

		if (events.length > 0) {
			lastFlush = Date.now();
			onFlush(events);
		}
	};

	const schedule = () => {
		if (timer) return;
		const elapsed = Date.now() - lastFlush;
		timer = setTimeout(flush, Math.max(0, intervalMs - elapsed));
	};

	const push = (event: T) => {
		const key = getKey(event);
		if (key) {
			const existingIndex = coalesced.get(key);
			if (existingIndex !== undefined) {
				// Replace previous event with same key
				queue[existingIndex] = undefined;
			}
			coalesced.set(key, queue.length);
		}
		queue.push(event);
		schedule();
	};

	const stop = () => {
		flush();
	};

	return { push, flush, stop };
}

/**
 * SSE event key generator for coalescing.
 * Returns a key for events that should be coalesced.
 */
export function getSSEEventKey(event: Events.Event): string | undefined {
	switch (event.t) {
		case "server.heartbeat":
			return "heartbeat";
		case "presence":
			return "presence";
		case "locks":
			return "locks";
		case "operation":
			// Don't coalesce ops - each one matters
			return undefined;
		case "patch":
			// Don't coalesce patches - each one matters
			return undefined;
		default:
			return undefined;
	}
}
