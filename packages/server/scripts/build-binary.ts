#!/usr/bin/env bun

import { chmodSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
	os:
		process.platform === "win32"
			? "win32"
			: process.platform === "darwin"
				? "darwin"
				: "linux",
	arch: process.arch === "arm64" ? "arm64" : "x64",
};

const targets = allFlag ? allTargets : [hostTarget];

const extFor = (os: Target["os"]) => (os === "win32" ? ".exe" : "");

const binaryNameFor = (t: Target) => {
	const parts = ["daw-server", t.os === "win32" ? "windows" : t.os, t.arch];
	if (t.baseline) parts.push("baseline");
	if (t.abi) parts.push(t.abi);
	return parts.join("-");
};

const bunCompileTargetFor = (t: Target) => {
	const parts = ["bun", t.os === "win32" ? "windows" : t.os, t.arch];
	if (t.abi) parts.push(t.abi);
	if (t.baseline) parts.push("baseline");
	return parts.join("-");
};

if (!skipClean) {
	await Bun.$`rm -rf dist`;
}
mkdirSync(path.resolve(pkgRoot, "dist"), { recursive: true });

for (const t of targets) {
	const ext = extFor(t.os);
	const outfile = path.resolve(
		pkgRoot,
		"dist",
		binaryNameFor(t),
		"bin",
		`daw-server${ext}`,
	);

	mkdirSync(path.dirname(outfile), { recursive: true });

	console.log(
		`building daw-server -> ${path.relative(pkgRoot, outfile)} (${bunCompileTargetFor(t)})`,
	);

	const result = await Bun.build({
		entrypoints: ["./src/index.ts"],
		sourcemap: "none",
		minify: true,
		target: "bun",
		compile: {
			target: bunCompileTargetFor(t) as never,
			outfile,
			windows: {},
		},
	});

	if (!result.success) {
		for (const log of result.logs) console.error(log);
		throw new Error("Bun.build failed");
	}

	if (t.os !== "win32") chmodSync(outfile, 0o755);
}
