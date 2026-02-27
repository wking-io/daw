# Audio Playback Implementation Plan

## Context

The DAW currently has a visual-only timeline with waveform rendering, clip management, and a transport that advances via `requestAnimationFrame` / `performance.now()` — but produces no sound. A separate prototype at `~/Developer/wking/app/routes/daw/` demonstrates a working AudioWorklet-based synth engine with DSP, typed messaging, and SharedArrayBuffer communication. This plan bridges the two: porting the engine infrastructure and extending it to support both audio clip playback and MIDI synthesis, integrated with the existing Remix Component timeline.

## Architecture Overview

```
packages/engine/             (NEW - audio engine, no UI)
  src/dsp/                   DSP primitives (oscillator, filter, envelope, voicing, limiter, micro-fade)
  src/engine/                Main-thread API (messenger, worklet-registry, engine-node)
  src/messages/              Shared message types (both threads)
  src/processors/            AudioWorkletProcessor (self-contained, bundled separately)

packages/app/src/audio/      (NEW - integration layer)
  decode.ts                  Unified stereo decode + resample (replaces separate mono path)
  buffer-cache.ts            LRU decoded buffer cache with memory limit
  schedule-builder.ts        ProjectView -> worklet clip schedule (with loop + sample-domain fields)
  audio-engine-context.ts    AudioEngineContext class (TypedEventTarget)

packages/app/src/root.tsx    (MODIFY - transport overhaul)
packages/app/src/timeline/components/timeline-root.tsx  (MODIFY - transport type)
packages/app/src/timeline/lib/waveform/cache.ts  (MODIFY - accept pre-decoded PCM)
packages/desktop/electron.vite.config.ts  (MODIFY - worklet build plugin + @engine alias)
packages/desktop/src/preload/index.ts  (MODIFY - add readAudioFile IPC)
packages/desktop/src/main/index.ts  (MODIFY - add IPC handler)
```

---

## Phase 0: Worklet Build Proof-of-Concept

**Goal**: Prove that an AudioWorklet can be loaded in Electron+Vite before investing in any DSP porting. This de-risks the highest-uncertainty integration point.

### Why this goes first

If the worklet cannot be loaded, every subsequent phase is blocked. The Vite build pipeline must produce a self-contained ESM file with a stable URL — something that electron-vite's default renderer config does not guarantee (it may hash filenames and code-split shared chunks).

### New files

| File | Purpose |
|------|---------|
| `packages/engine/package.json` | new package, deps: `effect` (catalog) |
| `packages/engine/tsconfig.json` | extends root |
| `packages/engine/src/processors/silence-processor.ts` | Minimal processor: extends `AudioWorkletProcessor`, `process()` outputs silence and returns `true`, calls `registerProcessor("daw-silence", ...)` |

### Modify `packages/desktop/electron.vite.config.ts`

The worklet needs different output settings than the main renderer bundle (no hashing, ESM format, no code splitting). A separate Vite plugin avoids conflicts with the renderer's rollup config.

Add a `vitePluginWorklet()` plugin to the renderer `plugins` array (line 58):

```ts
function vitePluginWorklet(): Plugin {
  return {
    name: "vite-plugin-worklet",
    // Production: compile worklet entries after main bundle
    async writeBundle() {
      await Bun.build({
        entrypoints: [resolve(repoRoot, "packages/engine/src/processors/silence-processor.ts")],
        outdir: resolve(__dirname, "dist/renderer/worklet"),
        format: "esm",
        naming: "[name].js",   // no content hash — addModule() needs stable URL
        // Bun.build inlines by default — no code splitting
      });
    },
    // Development: serve compiled worklet via middleware
    configureServer(server) {
      server.middlewares.use("/worklet", async (req, res, next) => {
        // Intercept requests for /worklet/*.js
        // Compile on-the-fly with Bun.build()
        // Return result with Content-Type: application/javascript
      });
    },
  };
}
```

Add alias (line 73-78): `"@engine": resolve(repoRoot, "packages/engine/src")`

### Verification

1. `bun run build:desktop` produces `dist/renderer/worklet/silence-processor.js`
2. Verify the built file has no external imports (self-contained ESM)
3. In the app, test: `new AudioContext()` → `ctx.audioWorklet.addModule("/worklet/silence-processor.js")` → create `AudioWorkletNode` → verify no errors
4. Test both dev mode (`bun run dev:desktop`) and production build

---

## Phase 0.5: IPC for Audio File Access

**Goal**: Establish the Electron IPC bridge for reading audio files from disk.

### Why this is needed

The renderer has `contextIsolation: true` and `nodeIntegration: false` (`window-manager.ts:18-19`). It cannot use `fs`. The existing preload (`preload/index.ts`) only exposes `platform`, `arch`, and `onCloseActiveTab`. Audio decode in Phase 6 requires reading file bytes from `AudioFile.storedPath`.

### Modifications

**`packages/desktop/src/preload/index.ts`** — Add to the `contextBridge.exposeInMainWorld` block:

```ts
readAudioFile: (storedPath: string): Promise<ArrayBuffer> => {
  return ipcRenderer.invoke("read-audio-file", storedPath);
},
```

**`packages/desktop/src/main/index.ts`** — Add IPC handler after `app.whenReady()`:

```ts
import { ipcMain } from "electron";
import { readFile } from "node:fs/promises";

ipcMain.handle("read-audio-file", async (_event, storedPath: string) => {
  // Security: validate storedPath is within the project audio directory
  const bytes = await readFile(storedPath);
  return bytes.buffer;
});
```

**`packages/app/src/root.tsx`** — Update the `Window` type declaration (lines 41-49) to include:

```ts
readAudioFile: (storedPath: string) => Promise<ArrayBuffer>;
```

### Tests
- IPC handler: invoke with a known audio file path, verify ArrayBuffer returned
- Security: invoke with a path outside the project, verify rejection

---

## Phase 1: `packages/engine` — Scaffold + DSP Port

**Goal**: New package with ported DSP and engine infrastructure from prototype.

### Graph system removal

The prototype `engine-node.ts` (864 lines) imports `Graph` from `../graph/core` and has a `syncGraph()` function that sends `GraphUpdate` messages. The prototype `types.ts` (517 lines) has graph-related message types (`GraphUpdate`, `ParameterUpdate`). **Strip all graph-related code during the port.** The node-graph audio routing is not used by the DAW yet. Keep synth commands, transport, and control messages.

### New files

| File | Source | Notes |
|------|--------|-------|
| `packages/engine/src/dsp/constants.ts` | prototype `lib/dsp/constants.ts` | verbatim |
| `packages/engine/src/dsp/oscillator.ts` | prototype `lib/dsp/oscillator.ts` | verbatim |
| `packages/engine/src/dsp/filter.ts` | prototype `lib/dsp/filter.ts` | verbatim |
| `packages/engine/src/dsp/envelope.ts` | prototype `lib/dsp/envelope.ts` | verbatim |
| `packages/engine/src/dsp/voice.ts` | prototype `lib/dsp/voice.ts` | verbatim |
| `packages/engine/src/dsp/voicing.ts` | prototype `lib/dsp/voicing.ts` | verbatim |
| `packages/engine/src/dsp/simple-limiter.ts` | prototype `lib/dsp/simple-limiter.ts` | verbatim |
| `packages/engine/src/dsp/audio-buffer.ts` | prototype `lib/dsp/audio-buffer.ts` | verbatim |
| `packages/engine/src/dsp/micro-fade.ts` | new | Linear fade: `fadeIn(buffer, offset, samples)`, `fadeOut(buffer, offset, samples)`. 5-10ms at 44.1kHz = 220-441 samples. Used for click-free seek, stop, and clip boundaries. |
| `packages/engine/src/engine/messenger.ts` | prototype `lib/engine/messenger.ts` | verbatim (no React deps) |
| `packages/engine/src/engine/realtime-queue.ts` | prototype `lib/engine/realtime-queue.ts` | verbatim |
| `packages/engine/src/engine/engine-bootstrap.ts` | prototype `lib/engine/engine-bootstrap.ts` | verbatim |

### Tests
- DSP unit tests: oscillator outputs non-zero, envelope transitions, filter passthrough
- micro-fade: verify ramp shape over N samples, buffer unchanged outside fade region

---

## Phase 2: Message Types + Audio Clip Player

**Goal**: Define the message protocol and implement audio buffer playback DSP.

### New files

**`packages/engine/src/messages/types.ts`** — Adapt from prototype (strip graph messages), add new messages:
- Keep: `Transport`, `Control`, `NoteOn`, `NoteOff`, `SetWaveform`, `SetFilter`, `SetEnvelope`, `SetGain`, `SetUnison`, `SetPitch`, `SetGlide`, `SetLfo`, `SetFilterKeytrack`
- Keep: `Ready`, `State`, `ErrorMessage`, `VoiceCount` (worklet→main)
- Remove: `GraphUpdate`, `ParameterUpdate` (graph system)
- Add `LoadAudioBuffer` (main→worklet): transfers decoded PCM Float32Array
- Add `UnloadAudioBuffer` (main→worklet): evict a buffer from worklet memory (for LRU cache)
- Add `UpdateClipSchedule` (main→worklet): clip schedule snapshot with `version: number`
- Add `UpdateTrackMix` (main→worklet): per-track volume/pan/mute/solo
- Add `PlayFrom` (main→worklet): atomic seek+play to avoid race conditions
- Add `PositionReport` (worklet→main): `{ sampleCount: number; contextTime: number }` — includes both sample position and `currentTime` for drift-free interpolation

**`packages/engine/src/messages/schedule.ts`** — Clip schedule types:
```ts
type ClipScheduleEntry = {
  clipId: string;
  trackId: string;
  trackType: "audio" | "midi";
  // Time-domain (seconds)
  startSec: number;
  endSec: number;
  // Sample-domain (precomputed on schedule update, not per-quantum)
  startSample: number;
  endSample: number;
  // Audio clips
  audioFileId?: string;
  audioOffsetSec?: number;
  audioOffsetSample?: number;     // precomputed: audioOffsetSec * sampleRate
  // Loop support (from domain model's audio-loop / midi-loop variants)
  loopStartSec?: number;          // start of repeating region (seconds)
  loopEndSec?: number;            // end of repeating region (seconds)
  loopLengthSamples?: number;     // precomputed: (loopEndSec - loopStartSec) * sampleRate
  // MIDI clips
  notes?: MidiNoteEntry[];
};

type MidiNoteEntry = {
  pitch: number;
  velocity: number;
  startSec: number;
  endSec: number;
};

type TrackMixState = {
  trackId: string;
  gainLinear: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  effectiveMute: boolean;         // true if muted OR (any track soloed AND this isn't)
};
```

**`packages/engine/src/dsp/audio-clip-player.ts`** — Reads PCM samples from a buffer at a given offset:
- `loadBuffer(L, R)` — stores transferred stereo audio data (already at context sample rate)
- `readInto(outL, outR, from, to, offsetSamples, gain, panL, panR)` — mixes into output
- Handles mono→stereo upmix
- **No resampling** — all buffers are pre-resampled to context sample rate during decode (Phase 6)
- **Loop playback**: when `loopLengthSamples` is set, wraps read position: `readPos = loopStartSample + ((readPos - loopStartSample) % loopLengthSamples)`
- **Micro-fade at clip boundaries**: applies fade-in for first ~220 samples of clip playback, fade-out for last ~220 samples. Also applies fade-in after seek to prevent clicks.

**`packages/engine/src/dsp/track-mixer.ts`** — Per-track processor:
- Holds either `AudioClipPlayer` references or a `Voicing` instance
- Applies gain + pan using equal-power law (cos/sin panning)
- Respects `effectiveMute` flag (solo logic is precomputed by `buildTrackMix()` on the main thread)

### Tests
- AudioClipPlayer: load known PCM, read at offset, verify samples
- AudioClipPlayer: loop wrap-around produces correct samples
- AudioClipPlayer: micro-fade ramp at clip start/end
- TrackMixer: gain/pan math, mute behavior
- TrackMixer: solo combinations — all 4 states (no solo, solo+included, solo+excluded, muted)
- Schedule types: verify sample-domain precomputation from sec values

---

## Phase 3: AudioWorklet Processor

**Goal**: Unified processor handling audio clips + MIDI synth with per-track performance optimization.

**`packages/engine/src/processors/engine-processor.ts`** — Extends prototype processor (with graph code stripped):

```ts
class EngineProcessor extends AudioWorkletProcessor {
  // Per-track sorted schedules with advancing index pointer
  private trackSchedules: Map<string, {
    entries: ClipScheduleEntry[];   // sorted by startSample
    activeIndex: number;            // advances as playback progresses
  }>;
  private audioBuffers: Map<string, { L: Float32Array; R: Float32Array }>;
  private scheduleVersion: number;
  private positionSamples: number;
  private isPlaying: boolean;
  private fadeState: "none" | "fading-in" | "fading-out";
  private fadeSamplesRemaining: number;
  private reportCounter: number;

  process(_inputs, outputs, parameters) {
    try {
      // 1. Drain realtime command queue (SharedArrayBuffer, graceful fallback)
      // 2. If not playing, output silence, return true
      // 3. If fading-in, apply fade-in ramp to output
      // 4. For each track:
      //    a. Advance activeIndex past clips that ended (O(1) amortized)
      //    b. Mix active audio clips using AudioClipPlayer
      //    c. Process MIDI voicing for active MIDI clips
      //    d. Apply per-track gain/pan (equal-power cos/sin panning)
      // 5. Apply master limiter + tanh soft clip
      // 6. If fading-out, apply fade-out ramp; set isPlaying=false when complete
      // 7. Advance position by RENDER_QUANTUM (128 samples)
      // 8. Report position every ~2048 samples (~46ms at 44.1kHz)
      //    Report includes { sampleCount, contextTime: currentTime }
    } catch {
      // Output silence on error, post one ErrorMessage, don't kill processor
    }
    return true;
  }

  // Message handlers:
  // LoadAudioBuffer: store transferred PCM in audioBuffers map
  // UnloadAudioBuffer: delete from audioBuffers map (frees memory)
  // UpdateClipSchedule: validate version >= current, rebuild per-track sorted arrays,
  //   precompute sample-domain fields, reset activeIndex pointers
  // UpdateTrackMix: update per-track gain/pan/mute/solo
  // PlayFrom: set positionSamples, fadeState="fading-in", isPlaying=true
  // Transport.stop: set fadeState="fading-out" (isPlaying=false after fade completes)
  // Transport.seek: reset positionSamples, fadeState="fading-in", reset activeIndex pointers
  // Transport.pause: set isPlaying=false immediately
}

registerProcessor("daw-engine", EngineProcessor);
```

The processor file must be self-contained (no imports from `effect` or browser globals). Uses plain `_tag` object dispatch like the prototype.

### Performance notes
- Schedules are per-track arrays sorted by `startSample` — rebuilt on each `UpdateClipSchedule`
- Each track maintains an `activeIndex` pointer that only advances forward during playback
- Per-quantum cost is O(active clips), not O(total clips)
- Avoid `Map` allocation/churn in the hot path — use stable data structures
- Target: 32-track mixing within ~2.9ms budget (128 samples at 44.1kHz)

### Tests
- Performance benchmark: 32-track audio mixing within budget
- Verify fade state machine transitions
- Worklet load in Electron (manual smoke test)

---

## Phase 4: Main-Thread Engine API

**Goal**: Wrapper that creates AudioContext, loads worklet, provides clean API with buffer lifecycle management.

**`packages/engine/src/engine/worklet-registry.ts`** — Port from prototype:
- `installWorklets(url)`, `createWorkletRegistry(ctx)`, `createEngineNode(registry)`
- SharedArrayBuffer for control flags + realtime queue (graceful fallback if unavailable — Electron doesn't set COOP/COEP headers currently)
- Try/catch pattern everywhere for SAB creation (matches prototype)

**`packages/engine/src/engine/engine-node.ts`** — Port from prototype, strip graph, add audio:
- Keep: `createEngine()`, `play()`, `stop()`, `pause()`, `seek()`, `sleep()`, `wake()`, `panic()`, `terminate()`, `noteOn()`, `noteOff()`, synth setters
- Remove: `syncGraph()`, all `Graph`/`NodeId` imports and references
- Add: `loadAudioBuffer(engine, audioFileId, pcmL, pcmR)`:
  ```ts
  // Uses postMessage with Transferable ArrayBuffer.
  // IMPORTANT: After transfer, the caller's Float32Arrays are detached.
  // The engine tracks which buffers have been transferred so the caller
  // doesn't re-use detached buffers.
  engine.transferredBuffers.add(audioFileId);
  engine.node.port.postMessage(
    { _tag: "LoadAudioBuffer", audioFileId, pcmL, pcmR },
    [pcmL.buffer, pcmR.buffer]
  );
  ```
- Add: `unloadAudioBuffer(engine, audioFileId)` — sends `UnloadAudioBuffer`, clears tracking
- Add: `updateClipSchedule(engine, schedule, version)` — sends versioned schedule
- Add: `updateTrackMix(engine, mixes)` — sends per-track mix state
- Add: `playFrom(engine, positionSec)` — atomic seek+play to avoid race conditions
- Add: `ensureResumed(engine)`:
  ```ts
  // MUST be called synchronously within a user gesture handler.
  // Chrome/Electron starts AudioContext in "suspended" state.
  if (engine.audioContext.state === "suspended") {
    engine.audioContext.resume();
  }
  ```
- Add: `onPositionReport` handler in `EngineNodeHandlers`

**`packages/engine/src/index.ts`** — Public barrel export.

### Tests
- Buffer transfer: verify original Float32Arrays have detached buffers after `loadAudioBuffer`
- `ensureResumed`: verify it calls `audioContext.resume()` when suspended

---

## Phase 5: Worklet Build Pipeline

**Goal**: Compile the processor into a standalone JS file loadable by `audioWorklet.addModule()`.

### Modify `packages/desktop/electron.vite.config.ts`

Update the `vitePluginWorklet()` plugin from Phase 0 to compile the real processor:

```ts
function vitePluginWorklet(): Plugin {
  return {
    name: "vite-plugin-worklet",
    async writeBundle() {
      await Bun.build({
        entrypoints: [
          resolve(repoRoot, "packages/engine/src/processors/engine-processor.ts"),
        ],
        outdir: resolve(__dirname, "dist/renderer/worklet"),
        format: "esm",
        naming: "[name].js",   // no content hash
      });
    },
    configureServer(server) {
      // Dev mode: serve compiled worklet via middleware
      server.middlewares.use("/worklet", async (req, res, next) => {
        const filename = req.url?.replace(/^\//, "");
        if (!filename?.endsWith(".js")) return next();
        const entry = resolve(repoRoot, "packages/engine/src/processors", filename.replace(".js", ".ts"));
        const result = await Bun.build({ entrypoints: [entry], format: "esm" });
        res.setHeader("Content-Type", "application/javascript");
        res.end(await result.outputs[0].text());
      });
    },
  };
}
```

### Key requirements
- **Format**: ESM (`audioWorklet.addModule()` requires it)
- **No content hash**: stable URL `/worklet/engine-processor.js`
- **Self-contained**: no code splitting, no external chunk imports
- **Dev + prod**: middleware for dev server, `writeBundle` for production

At runtime: `installWorklets("/worklet/engine-processor.js")` called during engine initialization.

### Tests
- Build check: `bun run build:desktop` produces `dist/renderer/worklet/engine-processor.js`
- Verify built file has no `import` statements (fully inlined)
- Dev check: Vite dev server responds to `/worklet/engine-processor.js` with correct MIME type

---

## Phase 6: App Integration Layer

**Goal**: Bridge domain models to engine; unified decode pipeline; LRU buffer cache; reactive schedule updates.

### New files in `packages/app/src/audio/`

**`decode.ts`** — Unified stereo decode + resample:
```ts
// Decode to stereo and resample to target sample rate in one step.
// Uses OfflineAudioContext for high-quality sinc resampling.
// This replaces the need for any resampling in the worklet.
async function decodeAudioStereo(
  source: ArrayBuffer,
  targetSampleRate: number,
): Promise<{ left: Float32Array; right: Float32Array; sampleRate: number }>

// Derive mono peaks from stereo data (for waveform display).
// Eliminates the need for a separate mono decode pass.
function deriveMonoFromStereo(
  left: Float32Array,
  right: Float32Array,
): Float32Array
```

**`buffer-cache.ts`** — LRU decoded buffer cache with memory limit:
```ts
class BufferCache extends EventTarget {
  private cache: Map<string, { left: Float32Array; right: Float32Array; sampleRate: number }>;
  private accessOrder: string[];   // LRU tracking
  private maxMemoryBytes: number;  // default 512MB
  private currentMemoryBytes: number;

  // Load on demand: read via IPC, decode + resample, cache
  async load(
    audioFileId: string,
    storedPath: string,
    targetSampleRate: number,
  ): Promise<{ left: Float32Array; right: Float32Array; sampleRate: number }>

  // Return cached buffer or null (no load)
  get(audioFileId: string): { left: Float32Array; right: Float32Array; sampleRate: number } | null

  // Evict from cache, free memory
  evict(audioFileId: string): void

  // Get IDs that should be evicted (over memory limit)
  getEvictionCandidates(): string[]
}
```

**`schedule-builder.ts`** — Converts ProjectView to worklet schedule:
```ts
// Handles all 4 clip payload variants: audio, audio-loop, midi, midi-loop.
// Precomputes sample-domain fields from seconds using sampleRate.
// Converts loop QNSpan → seconds → samples.
function buildClipSchedule(
  view: ProjectView,
  bpm: number,
  sampleRate: number,
): ClipScheduleEntry[]

// Converts volumeDb to linear gain, computes effectiveMute from solo logic.
// Solo rule: if ANY track has solo=true, tracks without solo get effectiveMute=true.
function buildTrackMix(view: ProjectView): TrackMixState[]
```

**`audio-engine-context.ts`** — Main engine lifecycle class:
```ts
class AudioEngineContext extends TypedEventTarget<{
  "position-report": CustomEvent<{ positionSec: number; contextTime: number }>;
  "state-change": Event;
}> {
  private audioContext: AudioContext | null = null;
  private engine: EngineNode | null = null;
  private bufferCache: BufferCache;
  private scheduleVersion = 0;

  // Create/resume AudioContext — MUST be called within user gesture
  ensureContext(): AudioContext

  // Load worklet module + create engine node
  async initialize(): Promise<void>

  // Load buffers on demand near the playhead using spatial index
  async loadBuffersForPlayback(view: ProjectView, playheadSec: number): Promise<void>

  // Reactive schedule updates with version tracking
  pushSchedule(view: ProjectView, bpm: number): void

  // Push track mix state
  pushTrackMix(view: ProjectView): void

  // Atomic seek+play
  playFrom(positionSec: number): void

  // Transport
  stop(): void
  seek(positionSec: number): void
  dispose(): void
}
```

### Modify `packages/app/src/timeline/lib/waveform/cache.ts`

Add `prepareFromPcm(audioFileId, monoPcm, sampleRate)` method to accept pre-decoded mono data. This enables the decode-once-use-twice flow:

1. `bufferCache.load()` decodes to stereo + resamples (for playback)
2. `deriveMonoFromStereo()` produces mono PCM
3. `peakCache.prepareFromPcm()` generates peaks from the mono data
4. No second decode needed

### Tests
- Schedule builder: QN→Sec with BPMs 60, 120, 140
- Schedule builder: loop field conversion from audio-loop / midi-loop payloads
- Schedule builder: MIDI note resolution from patterns
- buildTrackMix: solo/mute — 4 combinations (none, solo-only, mute-only, both)
- BufferCache: LRU eviction when over memory limit
- BufferCache: load returns correct data after IPC roundtrip
- Position→QN round-trip accuracy within 1 sample

---

## Phase 7: Transport Overhaul

**Goal**: Replace rAF-only transport with engine-authoritative clock, with position interpolation and refined transport semantics.

### Modify `packages/app/src/root.tsx` (lines 118-260)

**Transport state variables** (replace lines 121-127):
```ts
const bpm = demoProject.bpm;
let playing = false;
let playheadPos: QN.QN = QN.zero;
let followEnabled = true;
let rafId = 0;

// Engine-driven playback state
let engineCtx: AudioEngineContext | null = null;
let lastReportSec = 0;
let lastReportContextTime = 0;   // audioContext.currentTime from report
let engineInitialized = false;
let isInitializing = false;
```

**Position interpolation** (replace `tick()` at lines 129-137):
```ts
function tick() {
  if (!playing) return;

  // Interpolate between position reports for smooth 60fps.
  // Uses audioContext.currentTime (monotonic, matches audio clock).
  // Subtracts outputLatency so the visual playhead aligns with heard audio.
  const ctx = engineCtx?.audioContext;
  if (ctx && lastReportContextTime > 0) {
    const elapsed = ctx.currentTime - lastReportContextTime - (ctx.outputLatency ?? 0);
    const interpolatedSec = Sec.Sec(lastReportSec + Math.max(0, elapsed));
    playheadPos = Sec.toQN(interpolatedSec, bpm);
  }

  handle.update();
  rafId = requestAnimationFrame(tick);
}
```

**togglePlay** (replace lines 161-171):
```ts
async togglePlay() {
  if (!engineCtx) {
    engineCtx = new AudioEngineContext();
  }

  if (!playing) {
    // CRITICAL: resume AudioContext synchronously within this gesture handler.
    // If we await decode first, the user-gesture window closes and
    // audioContext.resume() will be silently ignored by Chrome.
    engineCtx.ensureContext();

    if (!engineInitialized && !isInitializing) {
      isInitializing = true;
      await engineCtx.initialize();
      await engineCtx.loadBuffersForPlayback(demoView, Number(Sec.fromQN(playheadPos, bpm)));
      engineCtx.pushSchedule(demoView, bpm);
      engineCtx.pushTrackMix(demoView);
      engineInitialized = true;
      isInitializing = false;
    }

    // Atomic seek+play avoids race with position reports
    engineCtx.playFrom(Number(Sec.fromQN(playheadPos, bpm)));
    playing = true;
    rafId = requestAnimationFrame(tick);
  } else {
    engineCtx.stop();   // triggers fade-out in worklet — no click
    playing = false;
    cancelAnimationFrame(rafId);
  }
  handle.update();
},
```

**setPlayheadPosition** (replace lines 152-159):
```ts
setPlayheadPosition(pos: QN.QN) {
  playheadPos = N.max(pos, QN.zero);
  // Ruler click must update the engine position even when paused,
  // so the next play starts from the correct position.
  if (engineInitialized && engineCtx) {
    const sec = Number(Sec.fromQN(playheadPos, bpm));
    if (playing) {
      engineCtx.playFrom(sec);   // atomic seek+play
    } else {
      engineCtx.seek(sec);
    }
  }
  handle.update();
},
```

**Reactive schedule updates** (after `handleUIAction` cases at lines 201-260):

```ts
// Debounce schedule pushes during drag operations to avoid
// spamming the worklet with rebuilds on every mouse-move frame.
let scheduleDebounceTimer = 0;

function pushScheduleDebounced() {
  clearTimeout(scheduleDebounceTimer);
  scheduleDebounceTimer = window.setTimeout(() => {
    if (engineInitialized && engineCtx) {
      engineCtx.pushSchedule(demoView, bpm);
      engineCtx.pushTrackMix(demoView);
    }
  }, 50);
}
```

Add `pushScheduleDebounced()` call at the end of `commit-clip-move` and `commit-clip-resize` cases. Also add after future clip creation, deletion, and loop-change operations.

**Position report handler**:
```ts
engineCtx.addEventListener("position-report", (e) => {
  const { positionSec, contextTime } = e.detail;
  lastReportSec = positionSec;
  lastReportContextTime = contextTime;
  playheadPos = Sec.toQN(Sec.Sec(positionSec), bpm);
});
```

**End-of-timeline behavior**: When the playhead passes the last clip, the worklet outputs silence but continues playing. This matches standard DAW behavior (Pro Tools, Ableton). The user stops manually. Auto-stop can be added later for bounce/export workflows.

### Modify `packages/app/src/timeline/components/timeline-root.tsx`

No structural changes needed — `TransportState` already has the right shape. The `togglePlay()` implementation in `root.tsx` changes internally but the interface is the same.

---

## Phase Summary

| Phase | Deliverable | Depends On |
|-------|-------------|------------|
| 0 | Worklet build proof-of-concept | — |
| 0.5 | IPC for audio file access | — |
| 1 | `packages/engine` with DSP + infra | — |
| 2 | Message types + AudioClipPlayer | Phase 1 |
| 3 | AudioWorklet processor | Phases 0, 1, 2 |
| 4 | Main-thread engine API | Phases 1, 3 |
| 5 | Worklet build in Vite (real processor) | Phases 0, 3 |
| 6 | App integration (decode, schedule, context) | Phases 0.5, 4 |
| 7 | Transport overhaul in root.tsx | Phase 6 |

Phases 0 and 0.5 can execute in parallel. Phases 1-5 are pure engine work (no UI changes). Phases 6-7 wire it into the app.

---

## Key Files to Modify

| File | Change |
|------|--------|
| `packages/desktop/electron.vite.config.ts` | Add worklet build plugin + `@engine` alias |
| `packages/desktop/src/preload/index.ts` | Add `readAudioFile` IPC bridge |
| `packages/desktop/src/main/index.ts` | Add `ipcMain.handle("read-audio-file")` handler |
| `packages/app/src/root.tsx` | Replace transport with engine-driven playback (lines 118-260) |
| `packages/app/src/timeline/lib/waveform/cache.ts` | Add `prepareFromPcm` for decode-once-use-twice |
| `packages/app/package.json` | Add `@daw/engine` workspace dependency |
| Root `package.json` / workspace config | Register new `packages/engine` workspace |

## Key Files to Reuse

| File | What to reuse |
|------|---------------|
| Prototype `lib/engine/*` | messenger, realtime-queue, engine-bootstrap, engine-node (strip graph), worklet-registry |
| Prototype `lib/dsp/*` | All DSP modules (oscillator, filter, envelope, voice, voicing, limiter) |
| `packages/app/src/timeline/lib/waveform/decode.ts` | mediabunny pipeline (reuse for stereo decode) |
| `packages/core/src/lib/sec.ts` | `Sec.fromQN()` / `Sec.toQN()` for time conversion |
| `packages/core/src/domain/project-view.ts` | `ProjectView` maps + spatial index for schedule building |
| `packages/core/src/domain/clip.ts` | `ClipPayload` variants (audio, audio-loop, midi, midi-loop) |

## Verification

### Unit tests (`bun run test`)
- DSP: oscillator, envelope, filter, micro-fade
- AudioClipPlayer: offset reading, loop wrap, clip-boundary fade
- TrackMixer: gain/pan math, solo/mute (4 combinations)
- Schedule builder: QN→Sec at BPMs 60/120/140, loop conversion, MIDI note resolution
- buildTrackMix: effectiveMute from solo logic
- Buffer transfer: ArrayBuffer detachment after postMessage
- Position→QN: round-trip accuracy within 1 sample
- Edge cases: empty project (no clips), zero-duration clips, seek to negative (clamp to 0)

### Integration tests
- Worklet loads without error in Electron (dev + prod)
- IPC `readAudioFile` returns correct ArrayBuffer
- AudioContext lifecycle: suspended → resume within gesture

### Performance benchmarks
- 32-track audio mixing within 2.9ms per 128-sample quantum (44.1kHz)
- Schedule building for 500 clips completes in under 10ms

### Manual verification
1. **Build check**: `bun run build:desktop` produces `dist/renderer/worklet/engine-processor.js`
2. **Play test**: Press Play — audio clips produce sound, playhead syncs with audio
3. **Seek test**: Click ruler to set position, press Play — audio starts from that position
4. **Seek while paused**: Click ruler, verify next Play starts from clicked position
5. **Follow test**: Enable Follow, press Play — timeline auto-scrolls with playhead
6. **Move test**: Drag a clip during playback — audio updates to match new position
7. **Stop test**: Press Stop — audio fades out cleanly (no click/pop)
8. **Loop test**: Play an audio-loop clip — audio repeats within the loop region

## Design Decisions

### Why `packages/engine` (not `packages/core`)?
`packages/core` is platform-agnostic (no browser APIs). AudioWorklet, AudioContext, and MessagePort are browser-only. The engine forms a self-contained domain consumed by `packages/app` but independent of UI concerns.

### Why a single unified processor?
Mixing happens in one place — per-track gain/pan is applied in the same `process()` call. Avoids complexity of connecting multiple processor nodes and summing externally. Audio clips and MIDI synth share the same timeline clock.

### Why ArrayBuffer transfer (not SharedArrayBuffer for audio data)?
SharedArrayBuffer requires COOP/COEP headers, which the Electron window-manager doesn't currently set. Audio buffers are decoded once and transferred to the worklet — a one-time cost, not per-frame. The worklet owns the data after transfer.

### Why worklet-authoritative clock?
The current `performance.now()` approach drifts relative to actual audio output. The worklet's sample counter is the ground truth. The main thread interpolates between `PositionReport` messages for smooth 60fps animation, using `audioContext.currentTime` for drift-free sync and subtracting `outputLatency` for visual accuracy.

### Why resample on decode, not in the worklet?
Nearest-neighbor resampling produces audible aliasing artifacts. Using `OfflineAudioContext` for resampling on the main thread leverages the browser's high-quality sinc interpolation. The worklet then operates at a single sample rate, simplifying the hot path.

### Why LRU buffer cache instead of loading everything upfront?
A 5-minute stereo file at 44.1kHz ≈ 211MB of Float32 data. A project with 20 audio files could exceed 4GB. The LRU cache loads only buffers near the current playhead and evicts least-recently-used entries when the memory limit is reached.

### Why debounced schedule pushes?
During drag operations, `commit-clip-move` fires on every mouse-move frame. Sending a full schedule rebuild on each frame would overwhelm the worklet's message queue. A 50ms debounce collapses rapid mutations into a single update.

### Why `playFrom()` instead of separate seek+play?
Separate seek and play messages can race with position reports. If a report arrives between seek and play, the main thread might incorrectly update the playhead to the old location. An atomic `playFrom` ensures the worklet transitions cleanly.

### Why keep playing silence past end of timeline?
This matches standard DAW behavior. The user explicitly stops playback. Auto-stopping would be surprising during recording workflows (future feature) or when the user expects to hear a reverb tail decay past the last clip boundary.
