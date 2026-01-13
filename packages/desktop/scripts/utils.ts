import { $ } from "bun"

export const SIDECAR_BINARIES: Array<{ rustTarget: string; binaryName: string; assetExt: string }> = [
  {
    rustTarget: "aarch64-apple-darwin",
    binaryName: "daw-mcp-darwin-arm64",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-apple-darwin",
    binaryName: "daw-mcp-darwin-x64",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-pc-windows-msvc",
    binaryName: "daw-mcp-windows-x64",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-unknown-linux-gnu",
    binaryName: "daw-mcp-linux-x64",
    assetExt: "tar.gz",
  },
  {
    rustTarget: "aarch64-unknown-linux-gnu",
    binaryName: "daw-mcp-linux-arm64",
    assetExt: "tar.gz",
  },
]

export const RUST_TARGET = process.env.RUST_TARGET

export function getCurrentSidecar(target = RUST_TARGET) {
  if (!target) throw new Error("RUST_TARGET not set")

  const binaryConfig = SIDECAR_BINARIES.find((b) => b.rustTarget === target)
  if (!binaryConfig) throw new Error(`Sidecar configuration not available for Rust target '${target}'`)

  return binaryConfig
}

export async function copyBinaryToSidecarFolder(source: string, target = RUST_TARGET) {
  await $`mkdir -p src-tauri/sidecars`
  const dest = `src-tauri/sidecars/daw-mcp-${target}${process.platform === "win32" ? ".exe" : ""}`
  await $`cp ${source} ${dest}`
  if (process.platform !== "win32") {
    await $`chmod +x ${dest}`
  }

  console.log(`Copied ${source} to ${dest}`)
}
