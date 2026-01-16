#!/usr/bin/env bun

import { createServer } from "node:net";

const requestedPort = Number(process.env.DAW_STATE_PORT ?? "43135");

const getAvailablePort = () =>
	new Promise<number>((resolve, reject) => {
		const server = createServer();
		server.unref();
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				reject(new Error("Failed to resolve available port"));
				return;
			}
			const { port } = address;
			server.close(() => resolve(port));
		});
	});

const killPortProcesses = (port: number) => {
	const list = Bun.spawnSync(["lsof", "-ti", `tcp:${port}`], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const output = list.stdout.toString().trim();
	const pids =
		output.length > 0 ? output.split("\n").map((pid) => pid.trim()) : [];
	if (pids.length === 0) return;
	Bun.spawnSync(["kill", "-TERM", ...pids], {
		stdout: "pipe",
		stderr: "pipe",
	});
	Bun.spawnSync(["kill", "-KILL", ...pids], {
		stdout: "pipe",
		stderr: "pipe",
	});
};

const isPortAvailable = (port: number) =>
	new Promise<{ available: boolean; error?: string }>((resolve) => {
		const server = createServer();
		server.unref();
		server.once("error", (error) => {
			resolve({ available: false, error: String(error) });
		});
		server.listen(port, "127.0.0.1", () => {
			server.close(() => resolve({ available: true }));
		});
	});

const resolvePort = async () => {
	if (!Number.isNaN(requestedPort) && requestedPort > 0) {
		const availability = await isPortAvailable(requestedPort);
		if (availability.available) return requestedPort;
		return getAvailablePort();
	}
	return getAvailablePort();
};

const probeSnapshot = async (port: number) => {
	const url = `http://127.0.0.1:${port}/snapshot`;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(300) });
		return { ok: res.ok, status: res.status };
	} catch {
		return { ok: false };
	}
};

const startServer = (port: number) => {
	return Bun.spawn(["bun", "run", "--cwd", "packages/server", "dev"], {
		env: {
			...process.env,
			DAW_STATE_PORT: String(port),
		},
		stdout: "inherit",
		stderr: "inherit",
	});
};

const runVerify = (port: number) => {
	return Bun.spawn(["bun", "./scripts/verify-server.ts"], {
		env: {
			...process.env,
			DAW_STATE_PORT: String(port),
			DAW_STATE_URL: `http://127.0.0.1:${port}`,
		},
		stdout: "inherit",
		stderr: "inherit",
	});
};

const run = async () => {
	let port = await resolvePort();
	if (requestedPort === 43135) {
		killPortProcesses(requestedPort);
	}
	const preStartProbe = await probeSnapshot(port);
	if (preStartProbe.ok) {
		port = await getAvailablePort();
	}
	const server = startServer(port);
	await probeSnapshot(port);
	try {
		const verify = runVerify(port);
		const exitCode = await verify.exited;
		if (exitCode !== 0) {
			process.exitCode = exitCode;
		}
	} finally {
		server.kill("SIGTERM");
		await server.exited;
	}
};

run().catch((error) => {
	console.error("verify-server-local failed:", error);
	process.exitCode = 1;
});
