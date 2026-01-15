## packages/contract Architecture

The contract package defines the shared schema and tool interfaces used across
the UI, server, and MCP sidecar. It is the single source of truth for
serialization and validation.

```mermaid
flowchart LR
  Instrument["Instrument domain"]
  Project["Project schemas"]
  Commands["InstrumentCommands"]
  Tools["InstrumentTools"]

  Instrument --> Project
  Commands --> Tools
  Project --> Commands
```

## Project State Shape

```mermaid
flowchart LR
  Submit["Submit (opId, baseVersion, actor, op)"]
  Op["Op (instrument.create)"]
  PatchBatch["PatchBatch (version + patches)"]
  Patch["Patch (instrument.add)"]
  Snapshot["Snapshot (version + doc)"]
  Doc["ProjectDoc (instruments[])"]

  Submit --> Op
  Snapshot --> Doc
  PatchBatch --> Patch
```

## Tool Contract Flow

```mermaid
sequenceDiagram
  autonumber
  participant Caller
  participant Tool as daw.instrument.create
  participant Result as CreateResult

  Caller->>Tool: CreateCommand
  Tool-->>Result: ok:true (Instrument) | ok:false (error)
```
