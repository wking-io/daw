## Repo Architecture

This repo is a multi-package workspace for a DAW prototype built on React, Effect,
and Tauri. The core ideas:

- The **state server** owns project state and persists it to SQLite.
- The **app UI** renders state and submits ops over HTTP, then listens to SSE.
- The **desktop shell** runs the UI and spawns the state and MCP sidecars.
- The **MCP server** exposes tool calls that also mutate state through the same API.
- The **contract** package is the single source of truth for schemas and tool shapes.

```mermaid
flowchart LR
  subgraph UI["packages/app (React UI)"]
    AppRoot["AppRoot + Atoms"]
  end

  subgraph Desktop["packages/desktop (Tauri)"]
    Webview["Tauri Webview"]
    IPC["IPC HTTP /command"]
    Sidecars["Spawns sidecars"]
  end

  subgraph Server["packages/server (State sidecar)"]
    Http["HTTP + SSE (/snapshot, /submitOp, /patches, /audio-deltas)"]
    Store["DawStore"]
    Persist["SQLite persistence"]
  end

  subgraph MCP["packages/mcp (MCP sidecar)"]
    McpHttp["/mcp HTTP server"]
    Tools["Tool handlers"]
  end

  subgraph Contract["packages/contract"]
    Schemas["Schemas + tool definitions"]
  end

  AppRoot -->|submitOp| Http
  AppRoot <-->|SSE patches/audio| Http
  Http --> Store
  Store <--> Persist

  Tools -->|getSnapshot / submitOp| Http
  McpHttp --> Tools

  Webview --> AppRoot
  Sidecars --> MCP
  Sidecars --> Server
  IPC <--> AppRoot

  Schemas --> AppRoot
  Schemas --> Server
  Schemas --> MCP
```

## User Flow: Create Instrument (UI)

```mermaid
sequenceDiagram
  autonumber
  participant UI as AppRoot (packages/app)
  participant State as State Server (packages/server)
  participant Store as DawStore
  participant DB as SQLite

  UI->>State: POST /submitOp (instrument.create)
  State->>Store: applyOp + compileAudio
  Store->>DB: appendEvent (+ snapshot every 25)
  Store-->>State: SubmitResult (patches + audio deltas)
  State-->>UI: HTTP response (SubmitResult)

  UI->>State: GET /patches?fromVersion=...
  UI->>State: GET /audio-deltas?fromVersion=...
  State-->>UI: SSE patch/audio batches
```

## Agent/Tool Flow: Create Instrument (MCP)

```mermaid
sequenceDiagram
  autonumber
  participant Agent as MCP Client
  participant MCP as MCP Server (packages/mcp)
  participant State as State Server (packages/server)
  participant Store as DawStore

  Agent->>MCP: Tool call daw.instrument.create
  MCP->>State: GET /snapshot
  MCP->>State: POST /submitOp (actor=agent)
  State->>Store: applyOp + persist
  Store-->>State: SubmitResult
  State-->>MCP: SubmitResult
  MCP-->>Agent: CreateResult (ok/err)
```

## Desktop IPC Flow: Tool Call Relay (Host -> UI)

```mermaid
sequenceDiagram
  autonumber
  participant Host as Host Process
  participant IPC as Tauri IPC HTTP (/command)
  participant UI as AppRoot (platform.onCommand)
  participant HostAPI as Tauri Command (respond_daw_command)

  Host->>IPC: POST /command (tool name + payload)
  IPC-->>UI: "daw:command" event
  UI-->>HostAPI: respond(requestId, resultJson)
  HostAPI-->>IPC: Resolve pending request
  IPC-->>Host: JSON result
```
