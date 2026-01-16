export interface DawCommandRequest {
	requestId: string;
	name: string;
	payload: unknown;
}

export function isTauriRuntime(): boolean {
	// Tauri injects internal APIs into the webview; this is absent in a normal browser.
	// `withGlobalTauri: true` exposes `window.__TAURI__`, but the internal bridge is
	// typically `window.__TAURI_INTERNALS__` (used by `@tauri-apps/api`).
	return (
		typeof window !== "undefined" &&
		(typeof (window as unknown as { __TAURI__?: unknown }).__TAURI__ !==
			"undefined" ||
			typeof (window as unknown as { __TAURI_INTERNALS__?: unknown })
				.__TAURI_INTERNALS__ !== "undefined")
	);
}

export interface Platform {
	/**
	 * Host->UI command channel (desktop IPC, etc.)
	 * Returns an unsubscribe function.
	 */
	onCommand: (handler: (req: DawCommandRequest) => void) => () => void;

	/**
	 * UI->Host response channel.
	 */
	respond: (requestId: string, resultJson: string) => Promise<void>;
}

export const NoopPlatform: Platform = {
	onCommand: () => () => {},
	respond: async () => {},
};
