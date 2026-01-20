# Build Plan: Device Data Model

## Overview

This document outlines the plan to implement data model for devices. Devices are what manipulate the midi and audio signals to produce different sounds and effects when applied to tracks. There are two main models we are concerned with.

- device_models: Default table of all available devices along with the parameters available for configuration
- device_patches: Table of presets that map a device_model to predefined parameters for a specific sound/effect

### Rules

* **Events are idempotent** and encode final state (no deltas/toggles).
* **All param addressing** uses `(deviceId, paramKey)` dot paths.

## Phase 0 — Contracts and invariants

### 0.1 Create contracts for data model in `@daw/contract`

Create schemas for the two data models. They should be based on 

---

## Phase 1 — SQLite schema + migrations (library + project)

### 1.1 Create migrations (SQL)

Add a migration that creates:

**Instrument models**

```sql
CREATE TABLE instrument_models (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  default_params_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_instrument_models_kind ON instrument_models(kind);
```

**Instrument presets**

```sql
CREATE TABLE instrument_presets (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT,
  is_factory INTEGER NOT NULL DEFAULT 0,
  author TEXT,
  schema_version INTEGER NOT NULL,
  params_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (model_id) REFERENCES instrument_models(id)
);
CREATE INDEX idx_instrument_presets_model ON instrument_presets(model_id);
CREATE INDEX idx_instrument_presets_name ON instrument_presets(name);
```

**Project devices** (if you don’t already have them)

```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  model_id TEXT NOT NULL,
  preset_id TEXT,
  params_json TEXT NOT NULL,
  bypass INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id),
  FOREIGN KEY (model_id) REFERENCES instrument_models(id),
  FOREIGN KEY (preset_id) REFERENCES instrument_presets(id)
);
CREATE INDEX idx_devices_project_track ON devices(project_id, track_id, position);
```

**Event log** (if you’re doing replay)

```sql
CREATE TABLE project_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  origin_client_id TEXT,
  command_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(project_id, seq),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE INDEX idx_project_events_project_seq ON project_events(project_id, seq);
```

### 1.2 Seed instrument models + factory presets

In migration or startup seed step:

* Insert `instrument_models` row for `"analog"` with `default_params_json = JSON.stringify(createDefaultAnalogParams())`
* Optionally insert a few factory presets into `instrument_presets` with `is_factory=1`

---

## Phase 2 — Effect-TS DB layer

### 2.1 Create `Db` service

Wrap SQLite access behind an Effect service:

**`services/Db.ts`**

* `query`, `run`, `transaction` helpers
* Provide `DbLive` for Bun SQLite library you’re using

Key requirement:

* A `transaction` helper that runs an Effect within a SQL transaction.

### 2.2 Create repository services (Effect-friendly)

Implement thin repositories that do only SQL + JSON encode/decode:

**`InstrumentModelRepo`**

* `getModel(modelId)`
* `listModels(kind?)`
* `upsertModel(...)` (optional)

**`PresetRepo`**

* `createPreset(modelId, presetData)`
* `getPreset(presetId)`
* `listPresets(modelId)`
* `searchPresets(query, modelId?)` (optional)
* `deletePreset` (optional)
* `updatePreset` (optional)

**`DeviceRepo`**

* `insertDevice(row)`
* `updateDeviceParams(deviceId, params_json, preset_id?)`
* `listDevicesForProject(projectId)` (for hydration)
* `shiftDevicePositions(trackId, fromIndex)` (if you need stable ordering)

**`ProjectEventRepo`**

* `appendEvents(projectId, events[])`
* `readEventsSince(projectId, sinceSeq)`
* `getCurrentSeq(projectId)`

Keep these repos small and composable. All validation happens in domain services (next phase).

---

## Phase 3 — Domain services in Effect-TS

### 3.1 InstrumentLibrary service (models + presets)

Create a higher-level service that uses repos and enforces rules.

**`services/InstrumentLibrary.ts`**
Responsibilities:

* Load `instrument_models.default_params_json` → validated `DeviceParams`
* Load preset `params_json` → validated params
* Save preset from a device patch
* Provide `getDefaultPatch(modelId)` and `getPresetPatch(presetId)`

API sketch:

* `getModel(modelId)`
* `getDefaultPatch(modelId)` → `{ params, schemaVersion }`
* `getPreset(presetId)` → metadata + `{ params, schemaVersion }`
* `listPresets(modelId)`
* `savePreset({ modelId, name, params, tags, ... })` → `presetId`

Add migration hook:

* `migrateParams(modelId, fromVersion, toVersion, params)` (initially identity)

### 3.2 PatchOps service (dot-path param updates)

Implement model-specific param updates:

* `setAnalogParam(params: AnalogParams, paramKey: string, value: unknown): AnalogParams`
* `updateDeviceParam(device: Device, paramKey: string, value: unknown): Device`

Keep this pure. Use Schema validation to ensure values are sane.

### 3.3 ProjectStore (authoritative state + persistence)

Implement the ProjectStore we discussed, but now it must integrate with:

* `DeviceRepo` to hydrate device rows into domain `Device`
* `ProjectEventRepo` to replay events and append new ones
* (optional) snapshot persistence; initially you can persist only device rows + event log

**ProjectStore responsibilities:**

* `ensureLoaded(projectId)`

  * Load base project + tracks
  * Load all device rows for project
  * Build `Project` object in memory
  * Determine current seq from `ProjectEventRepo.getCurrentSeq`
* `getSnapshot(projectId)` returns `{ project, seq }`
* `applyEvents(projectId, events)`

  * Reduce them into in-memory `Project`
  * Persist effects of events to SQLite:

    * append to `project_events`
    * apply materialized updates (e.g. `devices.params_json`, `devices.preset_id`, `devices.position` for create/move)
* `readEventsSince(projectId, since)` delegates to `ProjectEventRepo`

**Important**: All persistence changes happen in a *single transaction*:

* append events
* update devices table (and any others)
* update in-memory map after commit

### 3.4 EventBus service

Use `Hub<ProjectEvent>` to publish live events to SSE and other consumers.

* `publishAll(events)`
* `subscribe(projectId)` returns `Stream<ProjectEvent>`

### 3.5 CommandHandler

Implement:

* validate `CommandEnvelope` (Schema decode)
* fetch snapshot from ProjectStore
* `reduceCommandToEvents(project, seq, env)` → events with proper meta
* `ProjectStore.applyEvents(...)`
* `EventBus.publishAll(...)`
* return `{ events, newSeq }`

---

## Phase 4 — Commands & events for instruments/presets

Implement these domain flows end-to-end:

### 4.1 Create instrument device from defaults

Command:

* `CreateDevice { trackId, modelId: "analog", position, initialFrom: "default" }`

Event:

* `DeviceCreated { deviceId, trackId, modelId, kind:"instrument", position, params }`

Reducer:

* insert device into `Project.devices`
* insert deviceId into `Track.deviceChain` at position

Persistence:

* insert row in `devices` table with `params_json`
* shift positions if needed

### 4.2 Apply preset to device

Command:

* `SetDevicePreset { deviceId, presetId }`

Event:

* `DevicePresetApplied { deviceId, presetId, params }` (full params copy)

Reducer:

* set device.params = params
* set device.presetId metadata if you store it in domain

Persistence:

* `UPDATE devices SET params_json=?, preset_id=? WHERE id=?`

### 4.3 ChangeParam (automation + UI knob turns)

Command:

* `ChangeParam { deviceId, paramKey, value }`

Event:

* `ParamChanged { deviceId, paramKey, value }`

Reducer:

* update nested params (idempotent: if value already same → no-op)

Persistence:

* update `devices.params_json` (or if you later adopt “write-behind”, keep it direct for now)

### 4.4 Save preset from device (library operation)

This one is not strictly “project event” unless you want it to be. Recommended:

* Make it a separate **InstrumentLibrary API** (because it’s not part of project playback state)
* Still okay to expose via HTTP from sidecar and call from UI

API:

* `POST /presets/saveFromDevice { deviceId, name, tags }`:

  * load device row
  * insert preset row with `params_json = device.params_json`
  * return new preset id

Optionally:

* After saving, UI can call `SetDevicePreset` to set the device’s `preset_id` to the newly created preset.

---

## Phase 5 — HTTP API routes (Effect Platform)

Implement endpoints:

### Project

* `GET /project/:id`

  * `ProjectStore.ensureLoaded`
  * `ProjectStore.getSnapshot` → `{ project, version: seq }`

* `POST /project/:id/command`

  * parse `CommandEnvelope`
  * `CommandHandler.handle`
  * return `{ events, newSeq }`

* `GET /project/:id/events?since=N`

  * `replay = ProjectStore.readEventsSince(projectId, since)`
  * `live = EventBus.subscribe(projectId)`
  * `Stream.concat(replay, live)` → SSE

### Instrument library

* `GET /instrument-models`
* `GET /instrument-models/:modelId`
* `GET /presets?modelId=analog`
* `GET /presets/:presetId`
* `POST /presets` (create from provided params) optional
* `POST /presets/saveFromDevice` (recommended)

---

## Phase 6 — Client implementation

### 6.1 Atoms

* `projectAtom: Project | null`
* `projectMetaAtom: { projectId, lastSeq }`
* `pendingCommandsAtom: Record<commandId, {createdAt}>`

### 6.2 Hydration hook

* `useProjectHydrate(projectId)` does `GET /project/:id` and sets atoms.

### 6.3 SSE hook

* `useProjectSse(projectId)` opens EventSource `/project/:id/events?since=lastSeq`
* For each event:

  * dedupe if `evt.seq <= lastSeq`
  * clear pending if `evt.originClientId === clientId && evt.commandId`
  * apply `reduceProject(project, evt)` (safe due to idempotency)

### 6.4 Dispatch hook

* `useDispatchCommand(projectId)`

  * generate `commandId`, include stable `clientId`
  * (optional) optimistic apply via `reduceCommandOptimistic`
  * `POST /project/:id/command`

### 6.5 Preset UI flows

* Create device: dispatch `CreateDevice`
* Preset browser:

  * list presets via `GET /presets?modelId=analog`
  * apply preset: dispatch `SetDevicePreset`
  * save preset: call `POST /presets/saveFromDevice`, then optionally dispatch `SetDevicePreset` to “attach” it

---

## Phase 7 — Tests (must-have)

### 7.1 Reducer idempotency tests

For each event type, assert:

* `reduceProject(reduceProject(p, e), e) deepEquals reduceProject(p, e)`

Especially for:

* `ParamChanged`
* `DevicePresetApplied`
* `DeviceCreated`

### 7.2 Store + replay tests

* Append events to DB, reload ProjectStore, and verify:

  * snapshot matches expected
  * `readEventsSince` returns correct events
  * SSE replay order matches seq

### 7.3 End-to-end smoke test

* Create project
* Create analog device from defaults
* Change cutoff param
* Save preset from device
* Apply preset back
* Ensure device params persist across restart

---

## Phase 8 — Wiring all layers (Effect-TS)

Final Layer graph:

* `DbLive`
* `InstrumentModelRepoLive`, `PresetRepoLive`, `DeviceRepoLive`, `ProjectEventRepoLive`
* `InstrumentLibraryLive` (depends on repos)
* `PatchOpsLive` (pure helpers, can be plain module)
* `ProjectStoreLive` (depends on Db + repos + reduceProject)
* `EventBusLive`
* `CommandHandlerLive` (depends on ProjectStore + EventBus + reduceCommandToEvents)
* `HttpApiLive` (depends on CommandHandler + ProjectStore + InstrumentLibrary + EventBus)
* `ServerLive` (platform HTTP server)

Agent should implement `main.ts` that composes Layers and runs the server.

---

## Deliverable summary (what “done” looks like)

* SQLite has:

  * `instrument_models` seeded with `"analog"` and its default patch JSON
  * `instrument_presets` supports saving/loading patches
  * `devices` stores per-project instrument instances with `params_json`
  * `project_events` supports replay via `?since=`

* Server supports:

  * project snapshot hydration
  * command handling with event emission
  * SSE live updates + replay
  * preset listing + saving + applying

* Client supports:

  * hydrate once, then stay in sync via SSE
  * create analog instrument from defaults
  * tweak params with `ChangeParam`
  * apply presets with `SetDevicePreset`
  * save presets from device state

---

If you want the agent plan even more “actionable,” tell me what SQLite library you’re using in Bun (better-sqlite3 vs bun:sqlite vs sqlite wasm), and which HTTP server adapter (effect/platform-node vs bun). I’ll tailor the Layer wiring + DB service shape to that stack.
