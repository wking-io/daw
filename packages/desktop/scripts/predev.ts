#!/usr/bin/env bun

import { $ } from "bun";

import { copyBinaryToSidecarFolder, getCurrentSidecar } from "./utils";

const RUST_TARGET =
	process.env.TAURI_ENV_TARGET_TRIPLE ??
	process.env.RUST_TARGET ??
	(await $`rustc --print host-tuple`.text()).trim();

const mcpConfig = getCurrentSidecar("daw-mcp", RUST_TARGET);
const serverConfig = getCurrentSidecar("daw-server", RUST_TARGET);

const mcpBinaryPath = `../mcp/dist/${mcpConfig.binaryName}/bin/daw-mcp${process.platform === "win32" ? ".exe" : ""}`;
const serverBinaryPath = `../server/dist/${serverConfig.binaryName}/bin/daw-server${process.platform === "win32" ? ".exe" : ""}`;

await $`cd ../mcp && bun run build --single`;
await $`cd ../server && bun run build --single`;

await copyBinaryToSidecarFolder(mcpBinaryPath, RUST_TARGET, "daw-mcp");
await copyBinaryToSidecarFolder(serverBinaryPath, RUST_TARGET, "daw-server");
