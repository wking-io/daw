# OpenCode Feature Review for DAW

This document captures OpenCode architecture ideas worth adopting in this DAW codebase, and recommends how to implement them using Effect (server) and React (app) while aligning with the project's goals.

## Project goals (inferred)

- Single desktop app with a local sidecar server and clean readiness gating.
- Fast, reliable UI updates with server push (no polling thrash).
- Keep UI responsive under long sessions and large projects.
- Harden persistence and reduce runaway memory / disk usage.
- Maintain idiomatic Effect usage on the server and idiomatic React patterns in the UI.

## Current DAW shape (high level)

- Tauri spawns `daw-mcp` and `daw-server` sidecars and exposes a UI IPC bridge.
- Server exposes REST + WebSocket for snapshot/ops/presence/locks.
- UI reconnects to WS, fetches snapshots, and applies ops with gap recovery.
- Recent work added health checking + token auth + UI readiness gate.

## OpenCode features to adopt

### 1) Sidecar readiness gating + health checks
OpenCode uses a readiness command that blocks UI until the server is healthy and provides the canonical base URL and password. This removes transient UI errors and simplifies startup state.

Recommendation
- Keep the `get_server_info` flow but add a proper readiness command that waits for `/health` and returns `{ baseUrl, token }`.
- Make the UI gate render nothing (or a loading shell) until readiness resolves.

Effect/React implementation
- Server: keep `/health` returning `{ healthy: true, version }`.
- Desktop (Tauri): add `ensure_server_ready` that retries health checks with a timeout.
- React: wrap `AppRoot` with a `ServerGate` (or gate inside `AppRoot`) that waits for `ensure_server_ready`.

### 2) SSE event stream with heartbeat + "connected" event
OpenCode uses SSE for a global event stream and emits a heartbeat every 30s to avoid idle disconnects (WKWebView). It sends a `server.connected` event on connect.

Recommendation
- Add `GET /event` SSE with heartbeat and initial `server.connected`.
- Keep WS for interactive streams if needed, but use SSE for app state events.

Effect/React implementation
- Server: add a `Stream`-backed SSE response using `HttpServerResponse.stream` and a periodic `Stream.interval` heartbeat.
- React: create a small SSE client using `fetch` + `ReadableStream` so you can attach auth headers; parse events and forward to a global emitter.

### 3) Event coalescing to reduce UI thrash
OpenCode coalesces high-frequency events by key and batches emission on a short timer.

Recommendation
- Implement a coalescing queue for ops / patch events that frequently update the same entities.
- Apply coalescing only where it helps (transport updates, frequent patches, timeline updates).

Effect/React implementation
- React: add a small utility in `packages/app/src/utils` that batches events by key with a 16ms timer and allows last-write-wins semantics.
- Use in the store update path, not in render logic.

### 4) Per-directory / per-project server scoping
OpenCode uses a per-request directory scope so one server can handle multiple workspaces without cross-contamination.

Recommendation
- Add a `projectId` or `directory` scope on server requests, and plumb it into store selection.
- Keep a "global" scope for endpoints that are not project-specific.

Effect/React implementation
- Server: add middleware that extracts `projectId` from query or header and sets a context tag for store selection.
- React: the SDK should attach the active `projectId` on all relevant calls.

### 5) Persistence payload limits + blob store
OpenCode avoids storing large payloads inside KV stores and uses a blob store for big data (images, terminal buffers).

Recommendation
- Introduce per-key persistence caps and migrate large data to a blob store.
- This matters for audio previews, waveform blobs, or large cached outputs.

Effect/React implementation
- React: add a `persistPolicies` map for max bytes and transform hooks (e.g., strip large buffers).
- Add a blob store interface:
  - web: IndexedDB
  - desktop: Tauri file API (or a simple `invoke` to write files).

### 6) Request throttling + latest-only semantics
OpenCode uses debounced requests and cancels stale results to prevent overlapping requests from overwriting state.

Recommendation
- Add request helpers for debounce + latest-only for search, heavy queries, and timeline updates.

Effect/React implementation
- React: create `createDebouncedAsync` and `createLatestOnlyAsync` helpers in `packages/app/src/utils/requests.ts`.
- Use for search, timeline indexing, or any high-frequency UI-to-server calls.

### 7) Cache eviction (LRU + TTL + size caps)
OpenCode adds explicit cache eviction for in-memory stores to prevent growth over long sessions.

Recommendation
- Add an LRU cache helper and apply it to:
  - per-project state caches
  - file contents or sample caches
  - timeline render caches

Effect/React implementation
- React: create `createLruCache` in `packages/app/src/utils/cache.ts`, add TTL + size caps, and touch on access.

### 8) Scroll-spy optimization (observer + indexed offsets)
OpenCode replaces O(N) DOM scans with IntersectionObserver + binary search fallback.

Recommendation
- If there are large timeline/message lists, move to an observer-based approach and avoid repeated full DOM queries.

Effect/React implementation
- React: add a `scroll-spy` utility with `register/unregister` hooks and keep DOM work centralized.

### 9) Sidecar log capture + bounded log buffers
OpenCode keeps a bounded log deque for last N lines to help debug startup failures.

Recommendation
- Capture sidecar logs in Tauri with an in-memory ring buffer and expose via a command or dev UI.

Effect/React implementation
- Desktop: keep a fixed-size deque of stdout/stderr lines, return via `get_sidecar_logs`.

## Suggested phased adoption plan

1) Readiness + SSE (highest ROI)
   - Add SSE endpoint with heartbeat.
   - Add UI event stream + coalescing.
   - Tighten readiness gating and return canonical server info.

2) Request throttling + cache eviction
   - Add `requests.ts` and `cache.ts` helpers.
   - Apply to hot paths (search, timeline state, file caches).

3) Persistence hardening + blob store
   - Implement per-key limits and blob storage.
   - Migrate large stored payloads progressively.

4) Scoped caches + modularization
   - Introduce shared scoped cache utility.
   - Extract large components into view/controller modules to improve maintainability.

## Implementation notes (Effect + React idioms)

- Prefer Effect `Layer` composition for server config, auth, and per-project scoping.
- Use `Ref` / `SubscriptionRef` for push streams and shared state on the server.
- Keep React state updates incremental; apply coalescing before state updates, not inside render.
- Avoid full-UI re-renders by scoping updates to small stores (atoms or custom stores).

## Appendix: OpenCode sources reviewed

- Sidecar readiness + health: `packages/desktop/src-tauri/src/lib.rs`
- SSE streams + heartbeat: `packages/opencode/src/server/server.ts`
- Event coalescing: `packages/app/src/context/global-sdk.tsx`
- Persistence and throttling specs: `specs/01-persist-payload-limits.md`, `specs/03-request-throttling.md`
- Cache eviction + modularization specs: `specs/02-cache-eviction.md`, `specs/05-modularize-and-dedupe.md`
