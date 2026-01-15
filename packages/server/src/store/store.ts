import type { Project } from "@daw/contract";
import {
	Context,
	Effect,
	Layer,
	Option,
	Stream,
	SubscriptionRef,
} from "effect";
import { Persistence } from "../persist/sqlite";
import { applyOp, emptyDoc } from "./apply";
import { compileAudioDeltas } from "./compile-audio";

export interface StoreState {
	doc: Project.ProjectDoc;
	version: Project.ProjectVersion;
	patchLog: ReadonlyArray<Project.PatchBatch>;
	audioLog: ReadonlyArray<Project.AudioDeltaBatch>;
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
}

export class DawStore extends Context.Tag("daw/DawStore")<
	DawStore,
	DawStoreService
>() {}

const snapshotEvery = 25;

const makeInitialState = (
	snapshot: Project.Snapshot | null,
	events: ReadonlyArray<{ submit: Project.Submit; version: number }>,
) => {
	let doc = snapshot?.doc ?? emptyDoc;
	let version = snapshot?.version ?? 0;
	const patchLog: Array<Project.PatchBatch> = [];
	const audioLog: Array<Project.AudioDeltaBatch> = [];
	for (const event of events) {
		version = event.version;
		const applied = applyOp(doc, version, event.submit.op);
		const audioDeltas = compileAudioDeltas(applied.patches);
		doc = applied.doc;
		patchLog.push(applied.patches);
		audioLog.push(audioDeltas);
	}

	const state: StoreState = {
		doc,
		version,
		patchLog,
		audioLog,
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

	const getSnapshot = SubscriptionRef.get(stateRef).pipe(
		Effect.map((state) => ({ version: state.version, doc: state.doc })),
	);

	const patchStreamFrom = (fromVersion: number) =>
		Effect.gen(function* () {
			const state = yield* SubscriptionRef.get(stateRef);
			const initialBatches = state.patchLog.filter(
				(batch) => batch.version > fromVersion,
			);
			const updates = latestPatchRef.changes.pipe(
				Stream.filterMap((value) => value),
				Stream.filter((batch) => batch.version > fromVersion),
			);
			return Stream.concat(Stream.fromIterable(initialBatches), updates);
		});

	const audioStreamFrom = (fromVersion: number) =>
		Effect.gen(function* () {
			const state = yield* SubscriptionRef.get(stateRef);
			const initialBatches = state.audioLog.filter(
				(batch) => batch.version > fromVersion,
			);
			const updates = latestAudioRef.changes.pipe(
				Stream.filterMap((value) => value),
				Stream.filter((batch) => batch.version > fromVersion),
			);
			return Stream.concat(Stream.fromIterable(initialBatches), updates);
		});

	const submitOp = (submit: Project.Submit) =>
		SubscriptionRef.modifyEffect(stateRef, (state) =>
			Effect.gen(function* () {
				const nextVersion = state.version + 1;
				const applied = applyOp(state.doc, nextVersion, submit.op);
				const audioDeltas = compileAudioDeltas(applied.patches);
				const nextState: StoreState = {
					doc: applied.doc,
					version: nextVersion,
					patchLog: [...state.patchLog, applied.patches],
					audioLog: [...state.audioLog, audioDeltas],
					undoStack: [...state.undoStack, submit],
					redoStack: [],
				};

				yield* persistence
					.appendEvent({ version: nextVersion, submit })
					.pipe(Effect.orDie);
				if (nextVersion % snapshotEvery === 0) {
					yield* persistence
						.saveSnapshot({ version: nextVersion, doc: applied.doc })
						.pipe(Effect.orDie);
				}

				return [
					{
						version: nextVersion,
						patches: applied.patches,
						audioDeltas,
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
		);

	return DawStore.of({
		getSnapshot,
		submitOp,
		patchStreamFrom,
		audioStreamFrom,
	});
});

export const DawStoreLive = Layer.effect(DawStore, DawStoreLiveEffect);
