## packages/app Architecture

The app package is the React UI. It renders current DAW state, submits ops to the
state server, and streams patches/audio deltas over SSE. State in the UI is held
in Effect-Atom atoms.

```mermaid
flowchart LR
  AppRoot["AppRoot"]
  Providers["AppProviders + RegistryProvider"]
  Atoms["instrumentsAtom / logsAtom"]
  Rpc["rpc/client (HTTP + SSE)"]
  Worklet["audio/worklet-bridge"]

  Providers --> AppRoot
  AppRoot --> Atoms
  AppRoot --> Rpc
  Rpc --> AppRoot
  AppRoot --> Worklet
```

## UI State Flow

```mermaid
sequenceDiagram
  autonumber
  participant UI as AppRoot
  participant Rpc as DawStateClient
  participant State as State Server
  participant Atoms as Atom Registry

  UI->>Rpc: getSnapshot()
  Rpc->>State: GET /snapshot
  State-->>Rpc: Snapshot
  Rpc-->>UI: Snapshot
  UI->>Atoms: instrumentsAtom = snapshot.doc.instruments
  UI->>Rpc: subscribePatches(fromVersion)
  Rpc->>State: SSE /patches
  State-->>UI: PatchBatch (stream)
  UI->>Atoms: update instrumentsAtom
```

## User Flow: Create Instrument

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant UI as AppRoot
  participant Rpc as DawStateClient
  participant State as State Server

  User->>UI: Click "Create"
  UI->>Rpc: submitOp(instrument.create)
  Rpc->>State: POST /submitOp
  State-->>Rpc: SubmitResult (patches + audio)
  Rpc-->>UI: SubmitResult
  UI->>UI: Update instrumentsAtom + log
```
