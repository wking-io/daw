# DAW (Tauri + Bun + React + Effect + MCP)

## Local prerequisites (macOS)

- Xcode Command Line Tools: `xcode-select --install`
- Rust via rustup (stable toolchain)
- Bun (workspace enforces Bun via `preinstall`)

## Recommended Cursor extensions

See `.vscode/extensions.json`.

## Useful commands

- `bun install`
- `bun run --cwd packages/app dev` (web UI)
- `bun run --cwd packages/desktop tauri dev` (Tauri desktop)
- `bun run check` (TS + Biome + Rust check)

## Shared dependency versions ("catalog")

Shared dependency versions are centralized in the root `package.json` under `catalog`.
Workspace packages reference those versions with `"catalog:"`.
