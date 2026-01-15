## packages/desktop Architecture

The desktop package is the Tauri shell. It renders the shared UI, spawns the
state + MCP sidecars, and exposes a local IPC HTTP bridge that forwards tool
calls into the UI and returns results.

```mermaid
flowchart LR
  Webview["Tauri Webview (React UI)"]
  Platform["Tauri Platform adapter"]
  IPC["IPC HTTP /command (axum)"]
  McpSidecar["daw-mcp sidecar"]
  StateSidecar["daw-server sidecar"]

  Webview --> Platform
  IPC <--> Webview
  McpSidecar --> IPC
  StateSidecar --> Webview
```

## IPC Command Flow

```mermaid
sequenceDiagram
  autonumber
  participant Host as Local Host
  participant IPC as /command HTTP server
  participant UI as Webview
  participant Command as respond_daw_command

  Host->>IPC: POST /command (requestId + name + payload)
  IPC-->>UI: "daw:command" event
  UI-->>Command: respond_daw_command(requestId, resultJson)
  Command-->>IPC: Resolve pending request
  IPC-->>Host: JSON response
```

## Sidecar Lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant Tauri as Tauri App
  participant MCP as daw-mcp
  participant State as daw-server

  Tauri->>MCP: spawn sidecar (DAW_MCP_PORT, DAW_IPC_PORT)
  Tauri->>State: spawn sidecar (DAW_STATE_PORT)
  MCP-->>Tauri: stdout/stderr (logged)
  State-->>Tauri: stdout/stderr (logged)
```
