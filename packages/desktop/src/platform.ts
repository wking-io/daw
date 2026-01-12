import type { DawCommandRequest, Platform } from "@daw/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const TauriPlatform: Platform = {
	onCommand: (handler) => {
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
		await invoke("respond_daw_command", {
			request_id: requestId,
			result_json: resultJson,
		});
	},
};
