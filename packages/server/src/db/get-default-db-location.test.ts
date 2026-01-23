import { describe, expect, it } from "bun:test";
import { getDefaultDBLocation } from "./get-default-db-location";

const home = "/Users/test";
const winHome = "C:\\Users\\me";

describe("getDefaultDBLocation", () => {
	it("uses macOS Application Support on darwin", () => {
		const path = getDefaultDBLocation({ platform: "darwin", homeDir: home });
		expect(path).toBe(
			"/Users/test/Library/Application Support/DAW/daw-state.db",
		);
	});

	it("uses APPDATA on win32 when set", () => {
		const path = getDefaultDBLocation({
			platform: "win32",
			homeDir: winHome,
			env: { APPDATA: "C:\\Users\\me\\AppData\\Roaming" },
		});
		expect(path).toBe("C:\\Users\\me\\AppData\\Roaming\\DAW\\daw-state.db");
	});

	it("falls back to Roaming on win32 when APPDATA is unset", () => {
		const path = getDefaultDBLocation({
			platform: "win32",
			homeDir: winHome,
			env: {},
		});
		expect(path).toBe("C:\\Users\\me\\AppData\\Roaming\\DAW\\daw-state.db");
	});

	it("uses XDG_DATA_HOME on linux when set", () => {
		const path = getDefaultDBLocation({
			platform: "linux",
			homeDir: home,
			env: { XDG_DATA_HOME: "/data/home" },
		});
		expect(path).toBe("/data/home/daw/daw-state.db");
	});

	it("falls back to .local/share on linux when XDG_DATA_HOME is unset", () => {
		const path = getDefaultDBLocation({
			platform: "linux",
			homeDir: home,
			env: {},
		});
		expect(path).toBe("/Users/test/.local/share/daw/daw-state.db");
	});
});
