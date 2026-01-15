## packages/mcp Architecture

The MCP package exposes a Streamable HTTP MCP server. Tool handlers use an
Effect-native HTTP client to call the state server for snapshot and submit ops.

```mermaid
flowchart LR
  McpHttp["MCP HTTP (/mcp)"]
  Toolkit["DawToolkit"]
  Handlers["Tool handlers"]
  Client["DawStateClient"]
  State["State server (HTTP)"]

  McpHttp --> Toolkit
  Toolkit --> Handlers
  Handlers --> Client
  Client --> State
```

## Tool Call Flow: Create Instrument

```mermaid
sequenceDiagram
  autonumber
  participant Agent as MCP Client
  participant MCP as MCP Server
  participant Client as DawStateClient
  participant State as State Server

  Agent->>MCP: daw.instrument.create (params)
  MCP->>Client: handleCreateInstrument
  Client->>State: GET /snapshot
  Client->>State: POST /submitOp (actor=agent)
  State-->>Client: SubmitResult
  Client-->>MCP: CreateResult (ok/err)
  MCP-->>Agent: CreateResult
```
