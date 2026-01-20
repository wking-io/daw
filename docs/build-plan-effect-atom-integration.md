# Build Plan: Effect-Atom Integration with HttpApi + SSE

## Overview

This document outlines the plan to integrate `effect-atom` for state management in the DAW app, combining:
- **HttpApi client** for CRUD operations (create, update, delete instruments)
- **SSE events** for real-time updates (when MCP agents make changes)

## Problem Statement

The DAW app has a UI + MCP/Agent architecture where:
- UI makes HTTP requests to create/update/delete instruments
- MCP agents (via the server) can also create instruments
- UI needs to stay in sync with changes from both sources

Currently, we have manual atom management with `Atom.make()` for simple state. We need a pattern that:
1. Fetches initial data from HTTP endpoints
2. Allows UI to make mutations via HTTP
3. Automatically updates when SSE events arrive (from agent actions)

## Solution: Reactivity-Based Cache Invalidation

The `effect-atom` library provides `@effect/experimental/Reactivity` for cache invalidation:

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Component                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  useAtomValue(instrumentsAtom)                              │ │
│  │    → Result<Instrument[]>                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ auto-refreshes when
                              │ "instruments" key invalidated
                              │
┌─────────────────────────────────────────────────────────────────┐
│  instrumentsAtom = DawClient.query("project", "snapshot", {     │
│    reactivityKeys: ["instruments"]                              │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ invalidates "instruments" key
              ┌───────────────┴───────────────┐
              │                               │
┌─────────────────────────┐     ┌─────────────────────────┐
│  UI Mutation            │     │  SSE Event Handler      │
│  (user creates via UI)  │     │  (agent created via MCP)│
│                         │     │                         │
│  createInstrument({     │     │  Reactivity.invalidate( │
│    reactivityKeys:      │     │    ["instruments"]      │
│      ["instruments"]    │     │  )                      │
│  })                     │     │                         │
└─────────────────────────┘     └─────────────────────────┘
```

### Key Concepts

1. **Queries** register `reactivityKeys` they depend on
2. **Mutations** (HTTP or SSE-triggered) invalidate those keys
3. Atoms automatically refresh when their keys are invalidated

## Implementation Plan

### Phase 1: Define HttpApi Contract

This already exists in `packages/app/contract`

### Phase 2: Create AtomHttpApi Client


This already exists at `packages/app/src/api/client.ts`

### Phase 3: Define Reactive Atoms

**File: `packages/app/src/daw/atoms.ts`**

```typescript
import { Atom } from "@effect-atom/atom-react"
import { DawClient } from "../api/DawClient"
import type { Instrument, Project } from "@daw/contract"

// =============================================================================
// Reactivity Keys
// =============================================================================

/**
 * Centralized reactivity keys for cache invalidation.
 * When a mutation happens, invalidate the relevant key(s).
 */
export const ReactivityKeys = {
  /** Invalidate when any instrument changes */
  instruments: ["instruments"] as const,
  /** Invalidate when project version changes */
  project: ["project"] as const,
} as const

// =============================================================================
// Query Atoms
// =============================================================================

/**
 * Fetches the current project snapshot.
 * Auto-refreshes when "project" or "instruments" keys are invalidated.
 */
export const snapshotAtom = DawClient.query("project", "snapshot", {
  reactivityKeys: [...ReactivityKeys.project, ...ReactivityKeys.instruments],
  // Keep cached indefinitely (SSE will trigger refreshes)
  timeToLive: "infinity",
})

/**
 * Derived atom for just the instruments list.
 */
export const instrumentsAtom = Atom.make((get) => {
  const snapshot = get(snapshotAtom)
  return Result.map(snapshot, (s) => s.doc.instruments)
})

/**
 * Derived atom for the current version.
 */
export const versionAtom = Atom.make((get) => {
  const snapshot = get(snapshotAtom)
  return Result.map(snapshot, (s) => s.version)
})

// =============================================================================
// Mutation Atoms
// =============================================================================

/**
 * Submit an operation (create instrument, etc.)
 * 
 * Usage:
 * ```tsx
 * const submit = useAtomSet(submitOperationAtom)
 * submit({
 *   payload: { opId, baseVersion, actor: "ui", op: {...} },
 *   reactivityKeys: ReactivityKeys.instruments
 * })
 * ```
 */
export const submitOperationAtom = DawClient.mutation("project", "operations")

// =============================================================================
// Connection State
// =============================================================================

/** SSE connection status */
export const sseConnectedAtom = Atom.make(false).pipe(Atom.keepAlive)

/** Server health status */
export const serverReadyAtom = Atom.make(false).pipe(Atom.keepAlive)

/** Debug logs */
export const logsAtom = Atom.make<ReadonlyArray<string>>([]).pipe(Atom.keepAlive)
```

### Phase 4: SSE Handler with Reactivity Invalidation

**File: `packages/app/src/daw/sse-handler.ts`**

```typescript
import { Reactivity } from "@effect/experimental"
import { Effect } from "effect"
import type { Events } from "@daw/contract"
import { ReactivityKeys } from "./atoms"

/**
 * Determines which reactivity keys to invalidate based on an SSE event.
 */
function getInvalidationKeys(event: Events.Event): ReadonlyArray<unknown> | null {
  switch (event.t) {
    case "server.connected":
      // Full refresh on reconnect
      return [...ReactivityKeys.project, ...ReactivityKeys.instruments]

    case "operation": {
      const op = event.entry.submit.op
      switch (op.t) {
        case "instrument.create":
        case "instrument.delete":
        case "instrument.update":
          return ReactivityKeys.instruments
        default:
          return ReactivityKeys.project
      }
    }

    case "patch": {
      // Check if any patch affects instruments
      const hasInstrumentPatch = event.batch.patches.some(
        (p) => p.t === "instrument.add" || p.t === "instrument.remove"
      )
      return hasInstrumentPatch
        ? ReactivityKeys.instruments
        : ReactivityKeys.project
    }

    case "server.heartbeat":
      // No invalidation needed
      return null

    default:
      return null
  }
}

/**
 * Handle an SSE event by invalidating the appropriate reactivity keys.
 * 
 * @param event - The SSE event received
 * @param runEffect - Function to run an Effect (from the runtime)
 */
export function handleSSEEvent(
  event: Events.Event,
  runEffect: <A>(effect: Effect.Effect<A, never, Reactivity.Reactivity>) => void
): void {
  const keys = getInvalidationKeys(event)
  
  if (keys !== null && keys.length > 0) {
    runEffect(Reactivity.invalidate(keys))
  }
}

/**
 * Create an Effect that invalidates keys.
 * Can be used in tests or when you have direct access to the Effect runtime.
 */
export function invalidateKeys(
  keys: ReadonlyArray<unknown>
): Effect.Effect<void, never, Reactivity.Reactivity> {
  return Reactivity.invalidate(keys)
}
```

### Phase 5: Wire Up in React App

**File: `packages/app/src/app/AppRoot.tsx`**

```typescript
import {
  RegistryProvider,
  useAtomValue,
  useAtomSet,
  useRegistry,
  Result,
} from "@effect-atom/atom-react"
import { Atom } from "@effect-atom/atom"
import { Runtime } from "effect"
import { useEffect, useRef } from "react"
import { DawClient } from "../api/DawClient"
import {
  instrumentsAtom,
  sseConnectedAtom,
  logsAtom,
  submitOperationAtom,
  ReactivityKeys,
} from "../daw/atoms"
import { handleSSEEvent } from "../daw/sse-handler"
import { createSSEClient } from "../utils/sse"

function AppContent() {
  const registry = useRegistry()
  const setSseConnected = useAtomSet(sseConnectedAtom)
  const setLogs = useAtomSet(logsAtom)

  // Set up SSE connection with reactivity invalidation
  useEffect(() => {
    // Get the runtime that has the Reactivity service
    const runtimeAtom = DawClient.runtime
    
    // We need to subscribe to the runtime atom to get the actual runtime
    const unsubscribe = registry.subscribe(runtimeAtom, (result) => {
      if (!Result.isSuccess(result)) return
      
      const runtime = result.value
      
      // Helper to run invalidation effects
      const runEffect = <A,>(effect: Effect.Effect<A, never, Reactivity.Reactivity>) => {
        Runtime.runFork(runtime)(effect)
      }

      // Connect to SSE
      const cleanup = createSSEClient({
        baseUrl: import.meta.env.VITE_DAW_STATE_URL ?? "http://127.0.0.1:43125",
        onEvent: (event) => {
          // Log the event
          setLogs((logs) => [...logs, `← ${event.t}`])
          
          // Handle with reactivity invalidation
          handleSSEEvent(event, runEffect)
        },
        onError: (error) => {
          setSseConnected(false)
          setLogs((logs) => [...logs, `SSE error: ${error.message}`])
        },
        onClose: () => {
          setSseConnected(false)
        },
      })

      setSseConnected(true)

      return cleanup
    })

    return unsubscribe
  }, [registry, setSseConnected, setLogs])

  return (
    <div>
      <InstrumentList />
      <CreateInstrumentButton />
      <DebugLog />
    </div>
  )
}

function InstrumentList() {
  const instrumentsResult = useAtomValue(instrumentsAtom)

  return Result.builder(instrumentsResult)
    .onInitial(() => <div>Loading instruments...</div>)
    .onFailure((cause) => <div>Error loading instruments</div>)
    .onSuccess((instruments) => (
      <ul>
        {instruments.map((inst) => (
          <li key={inst.id}>{inst.name} ({inst.type})</li>
        ))}
      </ul>
    ))
    .render()
}

function CreateInstrumentButton() {
  const submit = useAtomSet(submitOperationAtom, { mode: "promiseExit" })
  const versionResult = useAtomValue(versionAtom)
  const version = Result.getOrElse(versionResult, () => 0)

  const handleCreate = async () => {
    const exit = await submit({
      payload: {
        opId: crypto.randomUUID(),
        baseVersion: version,
        actor: "ui",
        op: {
          t: "instrument.create",
          type: "synth",
          name: `Synth ${Date.now()}`,
          instrumentId: crypto.randomUUID(),
          createdAt: Date.now(),
        },
      },
      // This invalidates the cache, triggering a refetch
      reactivityKeys: ReactivityKeys.instruments,
    })

    if (Exit.isFailure(exit)) {
      console.error("Failed to create instrument", exit.cause)
    }
  }

  return <button onClick={handleCreate}>Create Instrument</button>
}

function DebugLog() {
  const logs = useAtomValue(logsAtom)
  return (
    <pre style={{ maxHeight: 200, overflow: "auto" }}>
      {logs.join("\n")}
    </pre>
  )
}

export function AppRoot() {
  return (
    <RegistryProvider>
      <AppContent />
    </RegistryProvider>
  )
}
```

### Phase 6: Update Package Dependencies

**File: `packages/app/package.json`** (additions)

```json
{
  "dependencies": {
    "@effect-atom/atom-react": "^0.x.x",
    "@effect/experimental": "^0.x.x",
    "@effect/platform": "^0.x.x",
    "@effect/platform-browser": "^0.x.x",
    "effect": "^3.x.x"
  }
}
```

## File Structure After Implementation

```
packages/app/src/
├── api/
│   └── DawClient.ts          # AtomHttpApi client definition
├── daw/
│   ├── atoms.ts              # All reactive atoms (queries, mutations, state)
│   ├── sse-handler.ts        # SSE event → reactivity invalidation
│   └── sse.ts                # SSE client (existing, low-level)
├── app/
│   └── AppRoot.tsx           # Main app component with wiring
└── utils/
    └── sse.ts                # SSE connection utility (existing)

packages/contract/src/
├── api.ts                    # HttpApi definition (new)
├── events.ts                 # SSE event schemas (existing)
├── instrument/               # Instrument schemas (existing)
└── project/                  # Project schemas (existing)
```

## Migration Path

### Step 1: Add Dependencies
- Add `@effect-atom/atom-react`, `@effect/experimental`, `@effect/platform`

### Step 2: Create HttpApi Definition
- Define `DawApi` in contract package with all endpoints

### Step 3: Create DawClient
- Create `AtomHttpApi.Tag` for the client

### Step 4: Migrate Atoms
- Replace manual `Atom.make()` with `DawClient.query()` for data fetching
- Add `reactivityKeys` to queries
- Create mutation atoms with `DawClient.mutation()`

### Step 5: Update SSE Handler
- Replace direct atom updates with `Reactivity.invalidate()`

### Step 6: Update React Components
- Use `useAtomValue()` for queries (with `Result.builder()` for rendering)
- Use `useAtomSet()` for mutations

## Benefits

1. **Automatic Cache Invalidation** - SSE events trigger refetches automatically
2. **Deduplication** - Rapid SSE events coalesce into single refetch
3. **Type Safety** - Full type inference from HttpApi schemas
4. **Testability** - Atoms and handlers can be tested independently
5. **Consistency** - Same pattern for UI mutations and SSE updates
6. **Error Handling** - `Result` type provides explicit loading/error/success states

## Alternative: Optimistic Updates

For better UX, you can combine cache invalidation with optimistic updates:

```typescript
// Optimistically add the instrument before server confirms
const createInstrumentOptimistic = Atom.fn(
  Effect.fnUntraced(function* (instrument: CreateInstrumentOp) {
    const client = yield* DawClient
    
    // Optimistically update local state
    yield* Atom.update(instrumentsAtom, (result) =>
      Result.map(result, (instruments) => [
        ...instruments,
        { ...instrument, id: instrument.instrumentId, status: "pending" }
      ])
    )
    
    // Submit to server
    const response = yield* client.project.operations({
      payload: instrument
    })
    
    // Server confirmed - invalidate to get real data
    yield* Reactivity.invalidate(ReactivityKeys.instruments)
    
    return response
  })
)
```

## References

- [effect-atom README](~/.reference/effect-atom/README.md)
- [AtomHttpApi source](~/.reference/effect-atom/packages/atom/src/AtomHttpApi.ts)
- [Atom source](~/.reference/effect-atom/packages/atom/src/Atom.ts)
- [@effect/experimental Reactivity](https://effect.website/docs/experimental)
