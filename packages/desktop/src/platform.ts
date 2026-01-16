import {
	type DawCommandRequest,
	isTauriRuntime,
	type Platform,
} from "@daw/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const TauriPlatform: Platform = {
	onCommand: (handler) => {
		if (!isTauriRuntime()) {
			// Avoid calling `listen()` in a normal browser tab (it will throw internally).
			return () => {};
		}

		const unlistenPromise = listen<DawCommandRequest>(
			"daw:command",
			(event) => {
				handler(event.payload);
			},
		);

		return () => {
			void unlistenPromise.then((unlisten) => unlisten());
		};
	},
	respond: async (requestId, resultJson) => {
		if (!isTauriRuntime()) {
			throw new Error(
				"Tauri runtime not available (respond called in a normal browser tab)",
			);
		}

		await invoke("respond_daw_command", {
			// Tauri expects camelCase argument keys here.
			requestId,
			resultJson,
		});
	},
};
