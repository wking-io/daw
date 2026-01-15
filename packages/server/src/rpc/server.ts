import { Project } from "@daw/contract";
import {
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { Effect, Layer, Schedule, Stream } from "effect";
import { DawStore } from "../store/store";

const sseHeaders = {
	"content-type": "text/event-stream",
	"cache-control": "no-cache",
	connection: "keep-alive",
	"access-control-allow-origin": "*",
};

const toSse = (event: string) => (data: unknown) =>
	`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const keepAlive = Stream.fromSchedule(Schedule.spaced("15 seconds")).pipe(
	Stream.as(": keep-alive\n\n"),
);

const sseResponse = (eventName: string, stream: Stream.Stream<unknown>) =>
	HttpServerResponse.stream(
		Stream.merge(stream.pipe(Stream.map(toSse(eventName))), keepAlive).pipe(
			Stream.encodeText,
		),
	).pipe(HttpServerResponse.setHeaders(sseHeaders));

class DawRouter extends HttpRouter.Tag("DawRouter")<DawRouter>() {}

const DawRoutes = DawRouter.use((router) =>
	Effect.gen(function* () {
		const store = yield* DawStore;
		yield* router.get(
			"/snapshot",
			Effect.gen(function* () {
				const snapshot = yield* store.getSnapshot;
				return yield* HttpServerResponse.schemaJson(Project.Snapshot)(snapshot);
			}),
		);

		yield* router.post(
			"/submitOp",
			Effect.gen(function* () {
				const submit = yield* HttpServerRequest.schemaBodyJson(Project.Submit);
				const result = yield* store.submitOp(submit);
				return yield* HttpServerResponse.schemaJson(Project.SubmitResult)(
					result,
				);
			}),
		);

		yield* router.get(
			"/patches",
			Effect.gen(function* () {
				const request = yield* HttpServerRequest.HttpServerRequest;
				const url = new URL(request.url);
				const fromVersion = Number.parseInt(
					url.searchParams.get("fromVersion") ?? "0",
					10,
				);
				const stream = yield* store.patchStreamFrom(
					Number.isNaN(fromVersion) ? 0 : fromVersion,
				);
				return sseResponse("patches", stream);
			}),
		);

		yield* router.get(
			"/audio-deltas",
			Effect.gen(function* () {
				const request = yield* HttpServerRequest.HttpServerRequest;
				const url = new URL(request.url);
				const fromVersion = Number.parseInt(
					url.searchParams.get("fromVersion") ?? "0",
					10,
				);
				const stream = yield* store.audioStreamFrom(
					Number.isNaN(fromVersion) ? 0 : fromVersion,
				);
				return sseResponse("audio-deltas", stream);
			}),
		);
	}),
);

const DawRoutesLive = DawRoutes.pipe(Layer.provideMerge(DawRouter.Live));

export const RpcHttpRoutesLive = HttpRouter.Default.use((router) =>
	Effect.gen(function* () {
		yield* router.mount("/", yield* DawRouter.router);
	}),
).pipe(Layer.provide(DawRoutesLive));
