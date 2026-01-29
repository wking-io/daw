import { getAtom, getAtomValue, Result } from "@daw/atom-remix";
import type * as Project from "@daw/core/domain/project";
import type { Handle, RemixNode } from "@remix-run/component";
import { Cause, DateTime } from "effect";
import { ApiClient } from "../api/client";
import { tabsAtom } from "../state/tabs";

type ProjectSummary = Project.ProjectSummary;

function ProjectCard(handle: Handle) {
	const [, setTabs] = getAtom(handle, tabsAtom);

	const handleClick = (project: ProjectSummary) => {
		setTabs((current) => {
			const existing = current.openTabs.find((t) => t.id === project.id);
			if (existing) {
				return { ...current, activeTabId: project.id };
			}
			return {
				openTabs: [
					...current.openTabs,
					{ id: project.id, name: project.name, hasUnsavedChanges: false },
				],
				activeTabId: project.id,
			};
		});
	};

	return (props: { project: ProjectSummary }) => {
		const { project } = props;

		return (
			<div
				class="cursor-pointer rounded-lg border border-neutral-600 bg-neutral-800 p-4 transition-colors hover:border-blue-500"
				on={{ click: () => handleClick(project) }}
			>
				<h3 class="m-0 mb-2 text-[15px] font-medium text-white">
					{project.name}
				</h3>
				<div class="text-xs text-neutral-500">
					Last modified:{" "}
					{DateTime.toDate(project.updatedAt).toLocaleDateString()}
				</div>
			</div>
		);
	};
}

function EmptyState(_handle: Handle) {
	return (props: { onCreateProject: () => void }) => (
		<div class="flex flex-col items-center justify-center px-6 py-16 text-center">
			<div class="mb-4 text-5xl opacity-50">🎵</div>
			<h2 class="m-0 mb-2 text-xl font-medium text-white">No projects yet</h2>
			<p class="m-0 mb-6 text-sm text-neutral-500">
				Create your first project to get started
			</p>
			<button
				type="button"
				class="cursor-pointer rounded-md border-none bg-blue-500 px-6 py-3 text-sm font-medium text-white hover:bg-blue-600"
				on={{ click: props.onCreateProject }}
			>
				Create Project
			</button>
		</div>
	);
}

export function ProjectListView(handle: Handle) {
	const getResult = getAtomValue(
		handle,
		ApiClient.query("project", "list", { reactivityKeys: ["projects"] }),
	);

	return (props: { onCreateProject: () => void }) => {
		const result = getResult();

		return Result.builder(result)
			.onInitial(() => (
				<div class="flex items-center justify-center p-16 text-neutral-500">
					Loading projects...
				</div>
			))
			.onSuccess((projects) => {
				if (projects.length === 0) {
					return <EmptyState onCreateProject={props.onCreateProject} />;
				}

				return (
					<div class="p-6">
						<div class="mb-6 flex items-center justify-between">
							<h2 class="m-0 text-lg font-medium text-white">Your Projects</h2>
							<button
								type="button"
								class="cursor-pointer rounded border-none bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
								on={{ click: props.onCreateProject }}
							>
								New Project
							</button>
						</div>

						<div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
							{projects.map((project) => (
								<ProjectCard key={project.id} project={project} />
							))}
						</div>
					</div>
				);
			})
			.onFailure((error) => (
				<div class="p-6 text-red-500">
					Error loading projects: {Cause.pretty(error)}
				</div>
			))
			.render() as RemixNode;
	};
}
