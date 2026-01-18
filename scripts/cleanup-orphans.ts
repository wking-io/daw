#!/usr/bin/env bun
/**
 * Cleanup orphan processes that can get left behind after stopping `dev:desktop`.
 *
 * Primary symptom: `daw-mcp` still listening on DAW_MCP_PORT (default 43124).
 *
 * Usage:
 *   bun ./scripts/cleanup-orphans.ts            # kills matching processes
 *   bun ./scripts/cleanup-orphans.ts --dry-run  # prints what it would do
 *
 * Notes:
 * - This is intentionally conservative: it only kills processes that look like
 *   they belong to this repo (cwd/command contains the repo root) OR are clearly
 *   the `daw-mcp` / `daw_desktop` binaries.
 */
import * as path from "path";

type KillSignal = "SIGTERM" | "SIGKILL";

const repoRoot = path.resolve(import.meta.dir, "..");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || args.has("-n");

const parsePort = (key: string, fallback: number): number => {
	const raw = process.env[key];
	if (!raw) return fallback;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? n : fallback;
};

const ports = {
	mcp: parsePort("DAW_MCP_PORT", 43124),
	state: parsePort("DAW_STATE_PORT", 43125),
	vite: parsePort("DAW_DEV_PORT", 1420),
} as const;

const run = async (cmd: string, cmdArgs: ReadonlyArray<string>) => {
	const proc = Bun.spawn([cmd, ...cmdArgs], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const exitCode = await proc.exited;
	return { stdout, stderr, exitCode };
};

const uniq = <T>(xs: ReadonlyArray<T>): ReadonlyArray<T> =>
	Array.from(new Set(xs));

const pidsListeningOnPort = async (
	port: number,
): Promise<ReadonlyArray<number>> => {
	// macOS: lsof -t prints just the PID(s)
	const { stdout } = await run("lsof", [
		"-nP",
		`-iTCP:${port}`,
		"-sTCP:LISTEN",
		"-t",
	]);
	return uniq(
		stdout
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => Number.parseInt(s, 10))
			.filter((n) => Number.isFinite(n)),
	);
};

const pidsMatchingPattern = async (
	pattern: string,
): Promise<ReadonlyArray<number>> => {
	// pgrep -f is convenient for "full command line" matching on macOS.
	// If pgrep finds nothing, it exits non-zero, so ignore exit code.
	const { stdout } = await run("pgrep", ["-f", pattern]);
	return uniq(
		stdout
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => Number.parseInt(s, 10))
			.filter((n) => Number.isFinite(n)),
	);
};

const procCommand = async (pid: number): Promise<string> => {
	// `command=` avoids the header line.
	const { stdout } = await run("ps", ["-p", String(pid), "-o", "command="]);
	return stdout.trim();
};

const procCwd = async (pid: number): Promise<string> => {
	// lsof -p PID -d cwd prints a "cwd" row; last column is the path.
	const { stdout } = await run("lsof", ["-nP", "-p", String(pid), "-d", "cwd"]);
	const lines = stdout
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	// Header is typically first; "cwd" entry is usually last.
	const cwdLine = lines.find((l) => /\bcwd\b/.test(l)) ?? lines.at(-1);
	if (!cwdLine) return "";
	const parts = cwdLine.split(/\s+/);
	return parts.at(-1) ?? "";
};

const looksLikeThisRepo = (command: string, cwd: string): boolean => {
	const haystack = `${command}\n${cwd}`;
	// Strong signals: binary names
	if (/\bdaw-mcp\b/.test(haystack)) return true;
	if (/\bdaw-server\b/.test(haystack)) return true;
	if (/\bdaw-desktop\b/.test(haystack)) return true;
	// Repo path involvement
	if (haystack.includes(repoRoot)) return true;
	return false;
};

const tryKill = async (pid: number, signal: KillSignal): Promise<boolean> => {
	if (dryRun) return true;
	const { exitCode } = await run("kill", [`-${signal}`, String(pid)]);
	return exitCode === 0;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const isAlive = async (pid: number): Promise<boolean> => {
	// `kill -0` checks for existence/permission without sending a signal.
	const { exitCode } = await run("kill", ["-0", String(pid)]);
	return exitCode === 0;
};

const main = async () => {
	const byPort = await Promise.all([
		pidsListeningOnPort(ports.mcp),
		pidsListeningOnPort(ports.state),
		pidsListeningOnPort(ports.vite),
	]);
	const portPids = uniq(byPort.flat());

	const patternPids = uniq(
		[
			...(await pidsMatchingPattern("\\bdaw-mcp\\b")),
			...(await pidsMatchingPattern("\\bdaw-server\\b")),
			...(await pidsMatchingPattern("\\bdaw-desktop\\b")),
			// Vite / bun processes started from this repo sometimes get orphaned too.
			...(await pidsMatchingPattern(
				`${repoRoot.replaceAll("/", "\\/")}.*\\bvite\\b`,
			)),
		].flat(),
	);

	const candidates = uniq([...portPids, ...patternPids]).filter(
		(pid) => pid !== process.pid,
	);
	if (candidates.length === 0) {
		console.log("No DAW dev orphans found.");
		return;
	}

	const inspected = await Promise.all(
		candidates.map(async (pid) => {
			const [command, cwd] = await Promise.all([
				procCommand(pid),
				procCwd(pid),
			]);
			return { pid, command, cwd, ok: looksLikeThisRepo(command, cwd) };
		}),
	);

	const targets = inspected.filter((p) => p.ok);
	const skipped = inspected.filter((p) => !p.ok);

	if (skipped.length > 0) {
		console.log("Skipping non-DAW processes (safety check):");
		for (const p of skipped) {
			console.log(
				`- pid=${p.pid} cmd=${p.command || "<unknown>"} cwd=${p.cwd || "<unknown>"}`,
			);
		}
	}

	if (targets.length === 0) {
		console.log("No safe-to-kill DAW dev orphans found.");
		return;
	}

	console.log(
		`${dryRun ? "[dry-run] " : ""}Killing ${targets.length} DAW dev orphan(s):`,
	);
	for (const p of targets) {
		console.log(
			`- pid=${p.pid} cmd=${p.command || "<unknown>"} cwd=${p.cwd || "<unknown>"}`,
		);
	}

	// Graceful termination first
	for (const p of targets) {
		await tryKill(p.pid, "SIGTERM");
	}

	// Wait a moment, then force kill anything still alive
	await sleep(500);
	const stillAlive = [];
	for (const p of targets) {
		if (await isAlive(p.pid)) stillAlive.push(p);
	}

	if (stillAlive.length > 0) {
		console.log(
			`${dryRun ? "[dry-run] " : ""}Force killing ${stillAlive.length} still alive:`,
		);
		for (const p of stillAlive) {
			console.log(`- pid=${p.pid}`);
			await tryKill(p.pid, "SIGKILL");
		}
	}

	console.log("Done.");
	console.log(
		`Ports checked: MCP=${ports.mcp} STATE=${ports.state} Vite=${ports.vite} (override via DAW_MCP_PORT/DAW_STATE_PORT/DAW_DEV_PORT)`,
	);
};

await main();
