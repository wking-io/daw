import { EditorEvent } from "@daw/core/events/editor";
import * as Ids from "@daw/core/ids";
import * as Versions from "@daw/core/versions";
import { Effect, PubSub, Schema, Stream } from "effect";

export const ProjectEventMessage = Schema.Struct({
	projectId: Ids.ProjectId,
	version: Versions.ProjectVersion,
	events: Schema.Array(EditorEvent),
});
export type ProjectEventMessage = Schema.Schema.Type<
	typeof ProjectEventMessage
>;

export class ProjectEventBus extends Effect.Service<ProjectEventBus>()(
	"server/ProjectEventBus",
	{
		effect: Effect.gen(function* () {
			const pubsub = yield* PubSub.unbounded<ProjectEventMessage>();

			const publish = (
				projectId: Ids.ProjectId,
				version: Versions.ProjectVersion,
				events: ReadonlyArray<EditorEvent>,
			) => PubSub.publish(pubsub, { projectId, version, events: [...events] });

			const subscribe = (projectId: Ids.ProjectId) =>
				Stream.fromPubSub(pubsub).pipe(
					Stream.filter((msg) => msg.projectId === projectId),
				);

			return { publish, subscribe };
		}),
	},
) {}
