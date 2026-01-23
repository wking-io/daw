import { ApiClient } from "@app/api/client";
import { Commands, Ids, Versions } from "@daw/core";
import { Result, useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Cause } from "effect";
/**
 * Main app content component.
 */
export function AppRoot() {
	const serverReady = useAtomValue(
		ApiClient.query("health", "health", {
			timeToLive: 5000,
		}),
	);

	return (
		<div style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
			<h2>DAW</h2>
			{serverReady ? <p>Server ready</p> : <p>Starting server...</p>}
			{serverReady && <ProjectList />}
		</div>
	);
}

function ProjectList() {
	const result = useAtomValue(
		ApiClient.query("project", "list", { reactivityKeys: ["projects"] }),
	);
	const create = useAtomSet(ApiClient.mutation("project", "create"));

	const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		create({
			payload: Commands.ProjectCreateCommand.make({
				id: Ids.generate("CommandId"),
				expectedVersion: Versions.ProjectVersion.make(0),
				actor: "ui",
				payload: Commands.ProjectCreate.make({
					t: "project.create",
					name,
					projectId: Ids.generate("ProjectId"),
				}),
			}),
			reactivityKeys: ["projects"],
		});
	};

	return Result.builder(result)
		.onInitial(() => null)
		.onSuccess((projects) => (
			<div>
				{projects.map((project) => (
					<div key={project.id}>{project.name}</div>
				))}
				<form onSubmit={handleCreate}>
					<input type="text" name="name" />
					<button type="submit">Create</button>
				</form>
			</div>
		))
		.onFailure((error) => <div>Error: {Cause.pretty(error)}</div>)
		.render();
}
