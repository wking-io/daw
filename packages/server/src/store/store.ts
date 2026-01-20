import type { Commands, Events, ProjectId } from "@daw/contract";
import { Effect, Option, Stream, SubscriptionRef } from "effect";
import { Persistence } from "../persist/sqlite";
import {
	applyCommand,
	emptyState,
	type ProjectState,
	stateToSnapshot,
} from "./apply";

export interface StoreState {
	state: ProjectState;
	version: number;
	eventLog: ReadonlyArray<Events.EventBatch>;
	undoStack: ReadonlyArray<Commands.Command>;
	redoStack: ReadonlyArray<Commands.Command>;
}

const snapshotEvery = 25;

const normalizeCommand = (command: Commands.Command): Commands.Command => {
	// TODO: Normalize command if needed (e.g., add generated IDs)
	return command;
};

const makeInitialState = (
	projectId: ProjectId,
	snapshot: Option.Option<Events.Snapshot>,
	eventBatches: ReadonlyArray<Events.EventBatch>,
): StoreState => {
	const projectState: ProjectState = snapshot.pipe(
		Option.map((snapshot) => ({
			project: snapshot.project,
			tracks: new Map(snapshot.tracks.map((t) => [t.id, t])),
			clips: new Map(snapshot.clips.map((c) => [c.id, c])),
			midiPatterns: new Map(snapshot.midiPatterns.map((p) => [p.id, p])),
			automationLanes: new Map(snapshot.automationLanes.map((l) => [l.id, l])),
			audioFiles: new Map(snapshot.audioFiles.map((f) => [f.id, f])),
		})),
		Option.getOrElse(() => emptyState(projectId)),
	);
	const eventLog: Array<Events.EventBatch> = [];

	const version = eventBatches
		.reduce<Option.Option<number>>((_, batch) => {
			eventLog.push(batch);
			return Option.some(batch.version);
		}, Option.none())
		.pipe(
			Option.orElse(() => snapshot.pipe(Option.map((s) => s.version))),
			Option.getOrElse(() => 0),
		);

	return {
		state: projectState,
		version,
		eventLog,
		undoStack: [],
		redoStack: [],
	};
};

interface ProjectStore {
	stateRef: SubscriptionRef.SubscriptionRef<StoreState>;
	latestEventRef: SubscriptionRef.SubscriptionRef<
		Option.Option<Events.EventBatch>
	>;
}

export class Store extends Effect.Service<Store>()("daw/Store", {
	effect: Effect.gen(function* () {
		const persistence = yield* Persistence;

		// Map of project stores, lazily initialized
		const projectStores = new Map<ProjectId, ProjectStore>();

		const getOrCreateProjectStore = (projectId: ProjectId) =>
			Effect.gen(function* () {
				const existing = projectStores.get(projectId);
				if (existing) return existing;

				// Load from persistence
				const maybeSnapshot = yield* persistence.findSnapshot({ projectId });

				const maybeEvents = yield* persistence.listEvents({
					projectId,
					version: maybeSnapshot.pipe(
						Option.map((snapshot) => snapshot.version),
						Option.getOrElse(() => 0),
					),
				});

				const initial = makeInitialState(projectId, maybeSnapshot, maybeEvents);

				const stateRef = yield* SubscriptionRef.make<StoreState>(initial);
				const latestEventRef = yield* SubscriptionRef.make<
					Option.Option<Events.EventBatch>
				>(Option.none());

				const store: ProjectStore = { stateRef, latestEventRef };
				projectStores.set(projectId, store);
				return store;
			});

		const getSnapshot = (projectId: ProjectId) =>
			Effect.gen(function* () {
				const store = yield* getOrCreateProjectStore(projectId);
				const state = yield* SubscriptionRef.get(store.stateRef);
				return stateToSnapshot(state.state, state.version);
			});

		const eventStreamFrom = (projectId: ProjectId, fromVersion: number) =>
			Effect.gen(function* () {
				const store = yield* getOrCreateProjectStore(projectId);
				const state = yield* SubscriptionRef.get(store.stateRef);
				const initialBatches = state.eventLog.filter(
					(batch) => batch.version > fromVersion,
				);
				const updates = store.latestEventRef.changes.pipe(
					Stream.filterMap((value) => value),
					Stream.filter((batch) => batch.version > fromVersion),
				);
				return Stream.concat(Stream.fromIterable(initialBatches), updates);
			});

		const getEventsAfter = (projectId: ProjectId, fromVersion: number) =>
			Effect.gen(function* () {
				const store = yield* getOrCreateProjectStore(projectId);
				const state = yield* SubscriptionRef.get(store.stateRef);
				return state.eventLog.filter((batch) => batch.version > fromVersion);
			});

		const executeCommand = (projectId: ProjectId, command: Commands.Command) =>
			Effect.gen(function* () {
				const store = yield* getOrCreateProjectStore(projectId);

				const result = yield* SubscriptionRef.modifyEffect(
					store.stateRef,
					(state) =>
						Effect.gen(function* () {
							const normalizedCommand = normalizeCommand(command);
							const nextVersion = state.version + 1;
							const applied = applyCommand(
								state.state,
								nextVersion,
								normalizedCommand.payload,
							);
							const eventBatch = applied.events;
							const nextState: StoreState = {
								state: applied.state,
								version: nextVersion,
								eventLog: [...state.eventLog, eventBatch],
								undoStack: [...state.undoStack, normalizedCommand],
								redoStack: [],
							};

							yield* persistence.createEvent({
								projectId,
								version: nextVersion,
								data: JSON.stringify(eventBatch),
							});

							if (nextVersion % snapshotEvery === 0) {
								yield* persistence.createSnapshot({
									projectId,
									version: nextVersion,
									data: JSON.stringify(
										stateToSnapshot(applied.state, nextVersion),
									),
								});
							}

							return [
								{
									version: nextVersion,
									events: eventBatch,
								},
								nextState,
							];
						}),
				);

				yield* SubscriptionRef.set(
					store.latestEventRef,
					Option.some(result.events),
				);

				return result;
			});

		const listProjects = () => persistence.listProjects().pipe(Effect.orDie);
		return {
			getSnapshot,
			executeCommand,
			eventStreamFrom,
			getEventsAfter,
			listProjects,
		};
	}),
	dependencies: [Persistence.Default],
}) {}
