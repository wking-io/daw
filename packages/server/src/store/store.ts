import type { Instrument, Project } from "@daw/contract";
import {
	Context,
	Effect,
	Layer,
	Option,
	Stream,
	SubscriptionRef,
} from "effect";
import { ulid } from "ulid";
import { Persistence } from "../persist/sqlite";
import { applyOp, emptyDoc } from "./apply";
import { compileAudioDeltas } from "./compile-audio";

export interface StoreState {
	doc: Project.ProjectDoc;
	version: Project.ProjectVersion;
	patchLog: ReadonlyArray<Project.PatchBatch>;
	audioLog: ReadonlyArray<Project.AudioDeltaBatch>;
	opLog: ReadonlyArray<Project.OpEntry>;
	undoStack: ReadonlyArray<Project.Submit>;
	redoStack: ReadonlyArray<Project.Submit>;
}

export interface DawStoreService {
	getSnapshot: Effect.Effect<Project.Snapshot>;
	submitOp: (submit: Project.Submit) => Effect.Effect<Project.SubmitResult>;
	patchStreamFrom: (
		fromVersion: number,
	) => Effect.Effect<Stream.Stream<Project.PatchBatch>>;
	audioStreamFrom: (
		fromVersion: number,
	) => Effect.Effect<Stream.Stream<Project.AudioDeltaBatch>>;
	opStreamFrom: (
		fromVersion: number,
	) => Effect.Effect<Stream.Stream<Project.OpEntry>>;
	getOpsAfter: (
		fromVersion: number,
	) => Effect.Effect<ReadonlyArray<Project.OpEntry>>;
}

export class DawStore extends Context.Tag("daw/DawStore")<
	DawStore,
	DawStoreService
>() {}

const snapshotEvery = 25;

const normalizeSubmit = (submit: Project.Submit): Project.Submit => {
	if (submit.op.t !== "instrument.create") return submit;
	return {
		...submit,
		op: {
			...submit.op,
			instrumentId:
				submit.op.instrumentId ?? (ulid() as Instrument.InstrumentId),
			createdAt: submit.op.createdAt ?? Date.now(),
		},
	};
};

const makeInitialState = (
	snapshot: Project.Snapshot | null,
	events: ReadonlyArray<{ submit: Project.Submit; version: number }>,
) => {
	let doc = snapshot?.doc ?? emptyDoc;
	let version = snapshot?.version ?? 0;
	const patchLog: Array<Project.PatchBatch> = [];
	const audioLog: Array<Project.AudioDeltaBatch> = [];
	const opLog: Array<Project.OpEntry> = [];
	for (const event of events) {
		version = event.version;
		const normalizedSubmit = normalizeSubmit(event.submit);
		const applied = applyOp(doc, version, normalizedSubmit.op);
		const audioDeltas = compileAudioDeltas(applied.patches);
		doc = applied.doc;
		patchLog.push(applied.patches);
		audioLog.push(audioDeltas);
		opLog.push({ version: event.version, submit: normalizedSubmit });
	}

	const state: StoreState = {
		doc,
		version,
		patchLog,
		audioLog,
		opLog,
		undoStack: [],
		redoStack: [],
	};
	return state;
};

const DawStoreLiveEffect = Effect.gen(function* () {
	const persistence = yield* Persistence;
	const snapshotRow = yield* persistence.loadLatestSnapshot.pipe(Effect.orDie);
	const eventRows = yield* persistence
		.loadEventsAfter(snapshotRow?.version ?? 0)
		.pipe(Effect.orDie);
	const initial = makeInitialState(
		snapshotRow ? { version: snapshotRow.version, doc: snapshotRow.doc } : null,
		eventRows,
	);

	const stateRef = yield* SubscriptionRef.make<StoreState>(initial);
	const latestPatchRef = yield* SubscriptionRef.make<
		Option.Option<Project.PatchBatch>
	>(Option.none());
	const latestAudioRef = yield* SubscriptionRef.make<
		Option.Option<Project.AudioDeltaBatch>
	>(Option.none());
	const latestOpRef = yield* SubscriptionRef.make<
		Option.Option<Project.OpEntry>
	>(Option.none());

	const getSnapshot = SubscriptionRef.get(stateRef).pipe(
		Effect.map((state) => ({ version: state.version, doc: state.doc })),
	);

	const patchStreamFrom = (fromVersion: number) =>
		Effect.gen(function* () {
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/server/src/store/store.ts:patchStreamFrom",
						message: "server.patchStreamFrom.entry",
						data: { fromVersion },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H23",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			const state = yield* SubscriptionRef.get(stateRef);
			const initialBatches = state.patchLog.filter(
				(batch) => batch.version > fromVersion,
			);
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/server/src/store/store.ts:patchStreamFrom",
						message: "server.patchStreamFrom.initial",
						data: { initialCount: initialBatches.length, fromVersion },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H23",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			const updates = latestPatchRef.changes.pipe(
				Stream.filterMap((value) => value),
				Stream.filter((batch) => batch.version > fromVersion),
			);
			return Stream.concat(Stream.fromIterable(initialBatches), updates);
		});

	const audioStreamFrom = (fromVersion: number) =>
		Effect.gen(function* () {
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/server/src/store/store.ts:audioStreamFrom",
						message: "server.audioStreamFrom.entry",
						data: { fromVersion },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H24",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			const state = yield* SubscriptionRef.get(stateRef);
			const initialBatches = state.audioLog.filter(
				(batch) => batch.version > fromVersion,
			);
			// #region agent log
			fetch(
				"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "packages/server/src/store/store.ts:audioStreamFrom",
						message: "server.audioStreamFrom.initial",
						data: { initialCount: initialBatches.length, fromVersion },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "pre-fix",
						hypothesisId: "H24",
					}),
				},
			).catch(() => {});
			// #endregion agent log
			const updates = latestAudioRef.changes.pipe(
				Stream.filterMap((value) => value),
				Stream.filter((batch) => batch.version > fromVersion),
			);
			return Stream.concat(Stream.fromIterable(initialBatches), updates);
		});

	const opStreamFrom = (fromVersion: number) =>
		Effect.gen(function* () {
			const state = yield* SubscriptionRef.get(stateRef);
			const initialEntries = state.opLog.filter(
				(entry) => entry.version > fromVersion,
			);
			const updates = latestOpRef.changes.pipe(
				Stream.filterMap((value) => value),
				Stream.filter((entry) => entry.version > fromVersion),
			);
			return Stream.concat(Stream.fromIterable(initialEntries), updates);
		});

	const getOpsAfter = (fromVersion: number) =>
		SubscriptionRef.get(stateRef).pipe(
			Effect.map((state) =>
				state.opLog.filter((entry) => entry.version > fromVersion),
			),
		);

	const submitOp = (submit: Project.Submit) =>
		SubscriptionRef.modifyEffect(stateRef, (state) =>
			Effect.gen(function* () {
				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/store/store.ts:submitOp",
							message: "server.submitOp.entry",
							data: {
								stateVersion: state.version,
								opType: submit.op.t,
								actor: submit.actor,
								baseVersion: submit.baseVersion,
							},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H3",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				const normalizedSubmit = normalizeSubmit(submit);
				const nextVersion = state.version + 1;
				const applied = applyOp(state.doc, nextVersion, normalizedSubmit.op);
				const audioDeltas = compileAudioDeltas(applied.patches);
				const nextState: StoreState = {
					doc: applied.doc,
					version: nextVersion,
					patchLog: [...state.patchLog, applied.patches],
					audioLog: [...state.audioLog, audioDeltas],
					opLog: [
						...state.opLog,
						{ version: nextVersion, submit: normalizedSubmit },
					],
					undoStack: [...state.undoStack, normalizedSubmit],
					redoStack: [],
				};

				yield* persistence
					.appendEvent({ version: nextVersion, submit: normalizedSubmit })
					.pipe(Effect.orDie);
				if (nextVersion % snapshotEvery === 0) {
					yield* persistence
						.saveSnapshot({ version: nextVersion, doc: applied.doc })
						.pipe(Effect.orDie);
				}

				// #region agent log
				fetch(
					"http://127.0.0.1:7243/ingest/dd598364-6d60-4474-bb55-b3e85ee947cc",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "packages/server/src/store/store.ts:submitOp",
							message: "server.submitOp.applied",
							data: {
								nextVersion,
								patchCount: applied.patches.patches.length,
								instrumentCount: applied.doc.instruments.length,
							},
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "pre-fix",
							hypothesisId: "H4",
						}),
					},
				).catch(() => {});
				// #endregion agent log
				const opEntry: Project.OpEntry = {
					version: nextVersion,
					submit: normalizedSubmit,
				};

				return [
					{
						version: nextVersion,
						patches: applied.patches,
						audioDeltas,
						opEntry,
					},
					nextState,
				];
			}),
		).pipe(
			Effect.tap((result) =>
				SubscriptionRef.set(latestPatchRef, Option.some(result.patches)),
			),
			Effect.tap((result) =>
				SubscriptionRef.set(latestAudioRef, Option.some(result.audioDeltas)),
			),
			Effect.tap((result) =>
				SubscriptionRef.set(latestOpRef, Option.some(result.opEntry)),
			),
			Effect.map((result) => ({
				version: result.version,
				patches: result.patches,
				audioDeltas: result.audioDeltas,
			})),
		);

	return DawStore.of({
		getSnapshot,
		submitOp,
		patchStreamFrom,
		audioStreamFrom,
		opStreamFrom,
		getOpsAfter,
	});
});

export const DawStoreLive = Layer.effect(DawStore, DawStoreLiveEffect);
