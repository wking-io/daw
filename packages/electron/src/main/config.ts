import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

export interface DawConfig {
  statePort: number;
  mcpPort: number;
  stateToken: string;
}

export function loadConfig(): DawConfig {
  // In development, config is in the package root
  // In production, it's next to the app executable
  const devConfigPath = join(__dirname, "../../.daw-config.json");
  const prodConfigPath = join(app.getPath("exe"), "../.daw-config.json");
  const configPath = app.isPackaged ? prodConfigPath : devConfigPath;

  if (existsSync(configPath)) {
    try {
      const contents = readFileSync(configPath, "utf-8");
      return JSON.parse(contents) as DawConfig;
    } catch {
      // Fall through to defaults
    }
  }

  // Fallback to env vars or defaults
  return {
    statePort: Number.parseInt(process.env.DAW_STATE_PORT ?? "43125", 10),
    mcpPort: Number.parseInt(process.env.DAW_MCP_PORT ?? "43124", 10),
    stateToken: process.env.DAW_STATE_TOKEN ?? crypto.randomUUID(),
  };
}
