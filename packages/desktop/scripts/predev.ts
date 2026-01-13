#!/usr/bin/env bun

import { $ } from "bun"

import { copyBinaryToSidecarFolder, getCurrentSidecar } from "./utils"

const RUST_TARGET =
  process.env.TAURI_ENV_TARGET_TRIPLE ?? process.env.RUST_TARGET ?? (await $`rustc --print host-tuple`.text()).trim()

const sidecarConfig = getCurrentSidecar(RUST_TARGET)

const binaryPath = `../mcp/dist/${sidecarConfig.binaryName}/bin/daw-mcp${process.platform === "win32" ? ".exe" : ""}`

await $`cd ../mcp && bun run build --single`

await copyBinaryToSidecarFolder(binaryPath, RUST_TARGET)
