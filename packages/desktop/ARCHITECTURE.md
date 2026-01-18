## packages/desktop Architecture

The desktop package is the Tauri shell. It renders the shared UI and spawns the
state + MCP sidecars. The MCP sidecar communicates directly with the state server
for all DAW operations.

```mermaid
flowchart LR
  Webview["Tauri Webview (React UI)"]
  Platform["Tauri Platform adapter"]
  McpSidecar["daw-mcp sidecar"]
  StateSidecar["daw-server sidecar"]

  Webview --> Platform
  Webview <--> StateSidecar
  McpSidecar <--> StateSidecar
```

## MCP → State Communication

The MCP sidecar communicates directly with the state server via HTTP:

```mermaid
sequenceDiagram
  autonumber
  participant Agent as MCP Client (AI Agent)
  participant MCP as daw-mcp
  participant State as daw-server

  Agent->>MCP: tool call (e.g. daw.instrument.create)
  MCP->>State: GET /snapshot
  State-->>MCP: current state
  MCP->>State: POST /submitOp
  State-->>MCP: result + patches
  MCP-->>Agent: tool result
```

## Sidecar Lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant Tauri as Tauri App
  participant State as daw-server
  participant MCP as daw-mcp

  Tauri->>State: spawn sidecar (DAW_STATE_PORT, DAW_STATE_TOKEN)
  Tauri->>Tauri: wait for /health
  State-->>Tauri: healthy
  Tauri->>MCP: spawn sidecar (DAW_MCP_PORT, DAW_STATE_PORT)
  MCP-->>Tauri: stdout/stderr (logged)
  State-->>Tauri: stdout/stderr (logged)
```

## Port Allocation

On startup, the Tauri app:

1. Checks if default ports are available (MCP=43124, STATE=43125)
2. If a port is in use, finds the next available port in a 100-port range
3. Passes allocated ports to sidecars via environment variables
4. Logs the final port assignments

## Graceful Shutdown

When the window closes or app exits:

1. Shutdown flag is set to stop sidecar output monitoring
2. All tracked sidecar child processes are explicitly killed
3. This prevents orphan processes from blocking ports on restart
