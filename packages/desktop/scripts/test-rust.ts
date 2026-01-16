#!/usr/bin/env bun

import { $ } from "bun";

/**
 * Ensure Rust tests run with the same env vars Tauri expects.
 *
 * - `TAURI_ENV_TARGET_TRIPLE`: used by tauri-build and sidecar resolution
 * - `RUST_TARGET`: used by our sidecar mapping helpers
 *
 * We also create a stub sidecar file so `tauri-build` doesn't fail resource
 * validation during `cargo test`.
 */

const triple =
	Bun.env.TAURI_ENV_TARGET_TRIPLE ??
	Bun.env.RUST_TARGET ??
	(await $`rustc --print host-tuple`.text()).trim();

if (!triple) throw new Error("Failed to determine Rust target triple");

// Ensure child processes inherit these.
const env = {
	...process.env,
	TAURI_ENV_TARGET_TRIPLE: triple,
	RUST_TARGET: triple,
};

const ext = process.platform === "win32" ? ".exe" : "";
const sidecars = ["daw-mcp", "daw-server"];

await $`mkdir -p src-tauri/sidecars`.env(env);

for (const sidecar of sidecars) {
	const dest = `src-tauri/sidecars/${sidecar}-${triple}${ext}`;

	// Create a tiny stub executable if missing.
	try {
		await $`test -f ${dest}`.env(env);
	} catch {
		if (process.platform === "win32") {
			await $`cmd /c type nul > ${dest}`.env(env);
		} else {
			await Bun.write(dest, "#!/bin/sh\nexit 0\n");
			await $`chmod +x ${dest}`.env(env);
		}
	}
}

await $`cargo test --manifest-path src-tauri/Cargo.toml`.env(env);
