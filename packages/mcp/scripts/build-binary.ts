#!/usr/bin/env bun

import { $ } from "bun";
import { chmodSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Build a self-contained `daw-mcp` executable using Bun's `compile` mode.
 *
 * This is intentionally modeled after opencode's multi-target builder:
 * - explicit compile targets (`bun-<os>-<arch>[-musl][-baseline]`)
 * - deterministic output paths
 * - optional multi-target builds for CI/release workflows
 *
 * By default, we build a single binary for the current host platform:
 *   dist/daw-mcp[.exe]
 */

type Target = {
  os: "linux" | "darwin" | "win32";
  arch: "arm64" | "x64";
  abi?: "musl";
  baseline?: true;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, "..");

process.chdir(pkgRoot);

const allFlag = process.argv.includes("--all");
const skipClean = process.argv.includes("--skip-clean");

const allTargets: Target[] = [
  { os: "linux", arch: "arm64" },
  { os: "linux", arch: "x64" },
  { os: "linux", arch: "arm64", abi: "musl" },
  { os: "linux", arch: "x64", abi: "musl" },
  { os: "darwin", arch: "arm64" },
  { os: "darwin", arch: "x64" },
  { os: "win32", arch: "x64" },
];

const hostTarget: Target = {
  os: process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux",
  arch: process.arch === "arm64" ? "arm64" : "x64",
};

const targets = allFlag ? allTargets : [hostTarget];

const extFor = (os: Target["os"]) => (os === "win32" ? ".exe" : "");

const binaryNameFor = (t: Target) => {
  const parts = ["daw-mcp", t.os === "win32" ? "windows" : t.os, t.arch];
  if (t.baseline) parts.push("baseline");
  if (t.abi) parts.push(t.abi);
  return parts.join("-");
};

const bunCompileTargetFor = (t: Target) => {
  // Bun compile targets look like:
  // - bun-darwin-arm64
  // - bun-darwin-x64
  // - bun-linux-x64
  // - bun-linux-x64-musl
  // - bun-linux-x64-baseline
  // - bun-windows-x64
  const parts = ["bun", t.os === "win32" ? "windows" : t.os, t.arch];
  if (t.abi) parts.push(t.abi);
  if (t.baseline) parts.push("baseline");
  return parts.join("-");
};

if (!skipClean) {
  await $`rm -rf dist`;
}
mkdirSync(path.resolve(pkgRoot, "dist"), { recursive: true });

for (const t of targets) {
  const ext = extFor(t.os);
  const outfile = path.resolve(pkgRoot, "dist", binaryNameFor(t), "bin", `daw-mcp${ext}`);

  mkdirSync(path.dirname(outfile), { recursive: true });

  console.log(`building daw-mcp -> ${path.relative(pkgRoot, outfile)} (${bunCompileTargetFor(t)})`);

  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    sourcemap: "none",
    minify: true,
    target: "bun",
    compile: {
      // Note: opencode uses `autoloadBunfig` / `autoloadDotenv` here, but
      // those options are not part of Bun's current `CompileBuildOptions`
      // types, and we don't rely on them for this binary.
      // Bun supports cross-compiling by downloading the target runtime artifact.
      // Modeled after opencode: always specify the explicit compile target.
      target: bunCompileTargetFor(t) as never,
      outfile,
      // Keep for parity with opencode; safe no-op on non-windows.
      windows: {},
    },
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("Bun.build failed");
  }

  if (t.os !== "win32") chmodSync(outfile, 0o755);
}
