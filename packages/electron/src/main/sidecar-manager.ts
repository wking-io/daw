import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { DawConfig } from "./config";
import { waitForHealth } from "./health-check";

const sidecars: ChildProcess[] = [];
let shuttingDown = false;

function getBinaryPath(name: string): string {
  const ext = process.platform === "win32" ? ".exe" : "";

  if (app.isPackaged) {
    // In packaged app, sidecars are in resources
    return join(process.resourcesPath, "sidecars", `${name}${ext}`);
  }

  // In development, sidecars are in resources/sidecars
  const devPath = join(__dirname, "../../resources/sidecars", `${name}${ext}`);
  if (existsSync(devPath)) {
    return devPath;
  }

  // Fallback: try to find in node_modules/.bin or PATH
  throw new Error(`Sidecar binary not found: ${name}. Run 'bun run predev' first.`);
}

function spawnSidecar(name: string, env: Record<string, string>): ChildProcess {
  const binaryPath = getBinaryPath(name);
  console.log(`[${name}] Starting: ${binaryPath}`);

  const child = spawn(binaryPath, [], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      console.log(`[${name}] ${line}`);
    }
  });

  child.stderr?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      console.error(`[${name}] ${line}`);
    }
  });

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.log(`[${name}] terminated: code=${code}, signal=${signal}`);
    }
  });

  child.on("error", (err) => {
    console.error(`[${name}] error:`, err);
  });

  sidecars.push(child);
  return child;
}

export async function startAll(config: DawConfig): Promise<void> {
  console.log(`[daw] Using ports: MCP=${config.mcpPort} STATE=${config.statePort}`);

  // Start the state server first
  spawnSidecar("daw-server", {
    DAW_STATE_PORT: String(config.statePort),
    DAW_STATE_TOKEN: config.stateToken,
  });

  // Wait for state server to be healthy
  console.log("[daw] Waiting for state server to be ready...");
  const baseUrl = `http://127.0.0.1:${config.statePort}`;
  const healthy = await waitForHealth(baseUrl, config.stateToken, 30000);

  if (!healthy) {
    console.warn("[daw] Warning: State server health check timed out, continuing anyway");
  } else {
    console.log("[daw] State server is ready");
  }

  // Start the MCP server
  spawnSidecar("daw-mcp", {
    DAW_MCP_PORT: String(config.mcpPort),
    DAW_STATE_PORT: String(config.statePort),
    DAW_STATE_TOKEN: config.stateToken,
  });
}

export function killAll(): Promise<void> {
  shuttingDown = true;
  console.log("[daw] Terminating sidecars...");

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // Force kill after 5s
      for (const child of sidecars) {
        if (!child.killed) {
          console.log(`[daw] Force killing sidecar (pid=${child.pid})`);
          child.kill("SIGKILL");
        }
      }
      resolve();
    }, 5000);

    let remaining = sidecars.length;
    if (remaining === 0) {
      clearTimeout(timeout);
      resolve();
      return;
    }

    for (const child of sidecars) {
      if (child.killed) {
        remaining--;
        if (remaining === 0) {
          clearTimeout(timeout);
          resolve();
        }
        continue;
      }

      child.once("exit", () => {
        remaining--;
        if (remaining === 0) {
          clearTimeout(timeout);
          resolve();
        }
      });

      child.kill("SIGTERM");
    }
  });
}
