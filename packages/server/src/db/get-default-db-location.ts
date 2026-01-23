import os from "os";
import path from "path";

export interface DefaultDbLocationOptions {
	platform?: NodeJS.Platform;
	homeDir?: string;
	env?: NodeJS.ProcessEnv;
}

export function getDefaultDBLocation(
	options: DefaultDbLocationOptions = {},
): string {
	const home = options.homeDir ?? os.homedir();
	const env = options.env ?? process.env;
	const platform = options.platform ?? process.platform;
	switch (platform) {
		case "darwin":
			return path.join(
				home,
				"Library",
				"Application Support",
				"DAW",
				"daw-state.db",
			);
		case "win32": {
			const appData = env.APPDATA ?? path.join(home, "AppData", "Roaming");
			return path.win32.join(appData, "DAW", "daw-state.db");
		}
		default: {
			const dataHome = env.XDG_DATA_HOME ?? path.join(home, ".local", "share");
			return path.join(dataHome, "daw", "daw-state.db");
		}
	}
}
