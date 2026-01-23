import { describe, expect, it } from "bun:test";
import {
	ApiError,
	type Commands,
	Ids,
	type Project,
	Versions,
} from "@daw/core";
import { DateTime, Effect, Layer } from "effect";
import { ProjectRepository } from "./repo";

const makeTestProject = (
	id: string,
	name: string,
): Project.ProjectWithTimestamps => ({
	id: Ids.ProjectId.make(id),
	name,
	version: Versions.ProjectVersion.make(1),
	bpm: 120,
	timeSignature: { numerator: 4, denominator: 4 },
	tracks: [],
	clips: [],
	midiPatterns: [],
	automationLanes: [],
	audioFiles: [],
	createdAt: DateTime.unsafeNow(),
	updatedAt: DateTime.unsafeNow(),
});

const makeProjectSummary = (
	id: string,
	name: string,
): Project.ProjectSummary => ({
	id: Ids.ProjectId.make(id),
	name,
	version: Versions.ProjectVersion.make(1),
	createdAt: DateTime.unsafeNow(),
	updatedAt: DateTime.unsafeNow(),
});

const makeCreateCommand = (
	projectId: Ids.ProjectId,
	name: string,
): Commands.ProjectCreateCommand => ({
	id: Ids.CommandId.make("cmd-1"),
	expectedVersion: Versions.ProjectVersion.make(0),
	actor: "ui",
	payload: {
		t: "project.create",
		projectId,
		name,
	},
});

type ListFn = ProjectRepository["list"];
type CreateFn = ProjectRepository["create"];

const makeTestLayer = (overrides: { list?: ListFn; create?: CreateFn }) => {
	const defaultList: ListFn = () => Effect.succeed([]);
	const defaultCreate: CreateFn = () =>
		Effect.succeed(makeTestProject("test-id", "Test Project"));

	return Layer.succeed(ProjectRepository, {
		list: overrides.list ?? defaultList,
		create: overrides.create ?? defaultCreate,
	} as unknown as ProjectRepository);
};

describe("ProjectRepository", () => {
	describe("list", () => {
		it("returns empty array when no projects exist", async () => {
			const testLayer = makeTestLayer({
				list: () => Effect.succeed([]),
			});

			const result = await Effect.gen(function* () {
				const repo = yield* ProjectRepository;
				return yield* repo.list();
			}).pipe(Effect.provide(testLayer), Effect.runPromise);

			expect(result).toEqual([]);
		});

		it("returns list of project summaries", async () => {
			const projects = [
				makeProjectSummary("proj-1", "Project One"),
				makeProjectSummary("proj-2", "Project Two"),
			];

			const testLayer = makeTestLayer({
				list: () => Effect.succeed(projects),
			});

			const result = await Effect.gen(function* () {
				const repo = yield* ProjectRepository;
				return yield* repo.list();
			}).pipe(Effect.provide(testLayer), Effect.runPromise);

			expect(result).toHaveLength(2);
			expect(result[0]?.name).toBe("Project One");
			expect(result[1]?.name).toBe("Project Two");
		});
	});

	describe("create", () => {
		it("creates a new project and returns it", async () => {
			const projectId = Ids.ProjectId.make("new-project-id");
			const createdProject = makeTestProject("new-project-id", "New Project");

			const testLayer = makeTestLayer({
				create: () => Effect.succeed(createdProject),
			});

			const result = await Effect.gen(function* () {
				const repo = yield* ProjectRepository;
				return yield* repo.create(makeCreateCommand(projectId, "New Project"));
			}).pipe(Effect.provide(testLayer), Effect.runPromise);

			expect(result.id).toBe(projectId);
			expect(result.name).toBe("New Project");
		});

		it("returns BadRequest error", async () => {
			const testLayer = makeTestLayer({
				create: () =>
					Effect.fail(
						new ApiError.BadRequest({
							detail: "Invalid payload",
						}),
					),
			});

			const result = await Effect.gen(function* () {
				const repo = yield* ProjectRepository;
				return yield* repo.create(
					makeCreateCommand(Ids.ProjectId.make("test"), "Test"),
				);
			}).pipe(Effect.provide(testLayer), Effect.flip, Effect.runPromise);

			expect(result).toBeInstanceOf(ApiError.BadRequest);
			expect((result as ApiError.BadRequest).detail).toBe("Invalid payload");
		});

		it("returns NotAcceptable error", async () => {
			const testLayer = makeTestLayer({
				create: () =>
					Effect.fail(
						new ApiError.NotAcceptable({
							detail: "Server rejected response",
						}),
					),
			});

			const result = await Effect.gen(function* () {
				const repo = yield* ProjectRepository;
				return yield* repo.create(
					makeCreateCommand(Ids.ProjectId.make("test"), "Test"),
				);
			}).pipe(Effect.provide(testLayer), Effect.flip, Effect.runPromise);

			expect(result).toBeInstanceOf(ApiError.NotAcceptable);
			expect((result as ApiError.NotAcceptable).detail).toBe(
				"Server rejected response",
			);
		});
	});
});
