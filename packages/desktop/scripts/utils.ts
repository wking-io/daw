import { $ } from "bun"

export const SIDECAR_TARGETS: Array<{
  rustTarget: string
  suffix: string
  assetExt: string
}> = [
  {
    rustTarget: "aarch64-apple-darwin",
    suffix: "darwin-arm64",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-apple-darwin",
    suffix: "darwin-x64",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-pc-windows-msvc",
    suffix: "windows-x64",
    assetExt: "zip",
  },
  {
    rustTarget: "x86_64-unknown-linux-gnu",
    suffix: "linux-x64",
    assetExt: "tar.gz",
  },
  {
    rustTarget: "aarch64-unknown-linux-gnu",
    suffix: "linux-arm64",
    assetExt: "tar.gz",
  },
]

export const RUST_TARGET = process.env.RUST_TARGET

export function getCurrentSidecar(baseName = "daw-mcp", target = RUST_TARGET) {
  if (!target) throw new Error("RUST_TARGET not set")

  const binaryConfig = SIDECAR_TARGETS.find((b) => b.rustTarget === target)
  if (!binaryConfig) throw new Error(`Sidecar configuration not available for Rust target '${target}'`)

  return {
    rustTarget: binaryConfig.rustTarget,
    binaryName: `${baseName}-${binaryConfig.suffix}`,
    assetExt: binaryConfig.assetExt,
  }
}

export async function copyBinaryToSidecarFolder(
  source: string,
  target = RUST_TARGET,
  baseName = "daw-mcp",
) {
  await $`mkdir -p src-tauri/sidecars`
  const dest = `src-tauri/sidecars/${baseName}-${target}${process.platform === "win32" ? ".exe" : ""}`
  await $`cp ${source} ${dest}`
  if (process.platform !== "win32") {
    await $`chmod +x ${dest}`
  }

  console.log(`Copied ${source} to ${dest}`)
}
