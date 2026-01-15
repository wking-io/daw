## packages/server Architecture

The server package is the state sidecar. It serves HTTP endpoints for snapshot,
submit operations, and SSE streams for patches + audio deltas. State lives in
`DawStore` and is persisted to SQLite via the persistence layer.

```mermaid
flowchart LR
  Http["HTTP + SSE routes"]
  Store["DawStore"]
  Apply["applyOp + compileAudioDeltas"]
  Persist["Persistence (SQLite)"]

  Http --> Store
  Store --> Apply
  Store <--> Persist
```

## Submit Flow

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant Http as HTTP /submitOp
  participant Store as DawStore
  participant Persist as SQLite

  Client->>Http: POST /submitOp (Project.Submit)
  Http->>Store: submitOp
  Store->>Store: applyOp + compileAudio
  Store->>Persist: appendEvent
  Store->>Persist: saveSnapshot (every 25)
  Store-->>Http: SubmitResult
  Http-->>Client: SubmitResult
```

## Streaming Flow

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant Http as SSE /patches & /audio-deltas
  participant Store as DawStore

  Client->>Http: GET /patches?fromVersion
  Http->>Store: patchStreamFrom
  Store-->>Http: Stream<PatchBatch>
  Http-->>Client: SSE patches

  Client->>Http: GET /audio-deltas?fromVersion
  Http->>Store: audioStreamFrom
  Store-->>Http: Stream<AudioDeltaBatch>
  Http-->>Client: SSE audio deltas
```
