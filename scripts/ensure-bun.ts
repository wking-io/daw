#!/usr/bin/env bun

/**
 * Enforce Bun as the only package manager for this workspace.
 *
 * This runs on `preinstall` and fails fast if someone tries npm/yarn/pnpm.
 */
const ua = Bun.env.npm_config_user_agent || "";

// Example user agents:
// - bun/1.1.0 (darwin arm64) ...
// - npm/10.8.2 node/v20.18.0 darwin arm64 workspaces/false
// - yarn/1.22.22 npm/? node/v20.18.0 darwin arm64
// - pnpm/9.12.0 npm/? node/v20.18.0 darwin arm64
const isBun = /\bbun\/\d+\./.test(ua) || ua.startsWith("bun/");

if (!isBun) {
	const pm = ua.split(" ")[0] || "(unknown package manager)";
	console.error(
		[
			"This monorepo is Bun-only.",
			"",
			`Detected: ${pm}`,
			"",
			"Use:",
			"  bun install",
			"  bun add <pkg> --cwd packages/<name>",
			"  bun update",
			"",
			`npm_config_user_agent=${JSON.stringify(ua)}`,
		].join("\n"),
	);
	process.exit(1);
}
