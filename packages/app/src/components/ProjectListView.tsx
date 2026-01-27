import { getAtom, getAtomValue, Result } from "@daw/atom-remix";
import type { Project } from "@daw/core";
import type { Handle, RemixNode } from "@remix-run/component";
import { Cause, DateTime } from "effect";
import { ApiClient } from "../api/client";
import { tabsAtom } from "../state/tabs";

type ProjectSummary = Project.ProjectSummary;

function ProjectCard(handle: Handle, _setupProps: { project: ProjectSummary }) {
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

	return (renderProps: { project: ProjectSummary }) => {
		const { project } = renderProps;

		return (
			<div
				css={{
					padding: "16px",
					backgroundColor: "#2d2d2d",
					borderRadius: "8px",
					border: "1px solid #444",
					cursor: "pointer",
					transition: "border-color 0.15s",
					"&:hover": {
						borderColor: "#3b82f6",
					},
				}}
				on={{ click: () => handleClick(project) }}
			>
				<h3
					css={{
						margin: "0 0 8px 0",
						fontSize: "15px",
						color: "#fff",
						fontWeight: 500,
					}}
				>
					{project.name}
				</h3>
				<div
					css={{
						fontSize: "12px",
						color: "#666",
					}}
				>
					Last modified:{" "}
					{DateTime.toDate(project.updatedAt).toLocaleDateString()}
				</div>
			</div>
		);
	};
}

function EmptyState(
	_handle: Handle,
	_setupProps: { onCreateProject: () => void },
) {
	return (renderProps: { onCreateProject: () => void }) => (
		<div
			css={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "64px 24px",
				textAlign: "center",
			}}
		>
			<div
				css={{
					fontSize: "48px",
					marginBottom: "16px",
					opacity: 0.5,
				}}
			>
				🎵
			</div>
			<h2
				css={{
					margin: "0 0 8px 0",
					fontSize: "20px",
					color: "#fff",
					fontWeight: 500,
				}}
			>
				No projects yet
			</h2>
			<p
				css={{
					margin: "0 0 24px 0",
					fontSize: "14px",
					color: "#666",
				}}
			>
				Create your first project to get started
			</p>
			<button
				type="button"
				css={{
					padding: "12px 24px",
					backgroundColor: "#3b82f6",
					border: "none",
					borderRadius: "6px",
					color: "#fff",
					fontSize: "14px",
					fontWeight: 500,
					cursor: "pointer",
					"&:hover": {
						backgroundColor: "#2563eb",
					},
				}}
				on={{ click: renderProps.onCreateProject }}
			>
				Create Project
			</button>
		</div>
	);
}

export function ProjectListView(
	handle: Handle,
	_setupProps: { onCreateProject: () => void },
) {
	const getResult = getAtomValue(
		handle,
		ApiClient.query("project", "list", { reactivityKeys: ["projects"] }),
	);

	return (renderProps: { onCreateProject: () => void }) => {
		const result = getResult();

		return Result.builder(result)
			.onInitial(() => (
				<div
					css={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "64px",
						color: "#666",
					}}
				>
					Loading projects...
				</div>
			))
			.onSuccess((projects) => {
				if (projects.length === 0) {
					return (
						<EmptyState
							setup={{ onCreateProject: renderProps.onCreateProject }}
							onCreateProject={renderProps.onCreateProject}
						/>
					);
				}

				return (
					<div css={{ padding: "24px" }}>
						<div
							css={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: "24px",
							}}
						>
							<h2
								css={{
									margin: 0,
									fontSize: "18px",
									color: "#fff",
									fontWeight: 500,
								}}
							>
								Your Projects
							</h2>
							<button
								type="button"
								css={{
									padding: "8px 16px",
									backgroundColor: "#3b82f6",
									border: "none",
									borderRadius: "4px",
									color: "#fff",
									fontSize: "13px",
									cursor: "pointer",
									"&:hover": {
										backgroundColor: "#2563eb",
									},
								}}
								on={{ click: renderProps.onCreateProject }}
							>
								New Project
							</button>
						</div>

						<div
							css={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
								gap: "16px",
							}}
						>
							{projects.map((project) => (
								<ProjectCard
									key={project.id}
									setup={{ project }}
									project={project}
								/>
							))}
						</div>
					</div>
				);
			})
			.onFailure((error) => (
				<div
					css={{
						padding: "24px",
						color: "#ef4444",
					}}
				>
					Error loading projects: {Cause.pretty(error)}
				</div>
			))
			.render() as RemixNode;
	};
}
