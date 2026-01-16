#!/usr/bin/env bun

import { $ } from "bun";

/**
 * `tauri-build` validates external sidecar resources exist at build time.
 * For `cargo test` we don't actually need the sidecar to run, but we *do*
 * need the file to exist so the build script doesn't fail.
 */

const triple = Bun.env.TAURI_ENV_TARGET_TRIPLE;

if (!triple) throw new Error("Failed to determine Rust target triple");

const ext = process.platform === "win32" ? ".exe" : "";
const dest = `src-tauri/sidecars/daw-mcp-${triple}${ext}`;

await $`mkdir -p src-tauri/sidecars`;

// Create a tiny stub executable if missing.
// (Enough for tauri-build resource validation during tests.)
try {
	await $`test -f ${dest}`;
} catch {
	if (process.platform === "win32") {
		await $`cmd /c type nul > ${dest}`;
	} else {
		await Bun.write(dest, "#!/bin/sh\nexit 0\n");
		await $`chmod +x ${dest}`;
	}
}
