import { getAtom, getAtomValue, Result } from "@daw/atom-remix";
import type * as Project from "@daw/core/domain/project";
import type { Handle, RemixNode } from "@remix-run/component";
import { Cause, DateTime } from "effect";
import { ApiClient } from "../api/client";
import { tabsAtom } from "../state/tabs";
import { Button } from "./button";

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
        openTabs: [...current.openTabs, { id: project.id, name: project.name, state: "idle" }],
        activeTabId: project.id,
      };
    });
  };

  return (props: { project: ProjectSummary }) => {
    const { project } = props;

    return (
      <div
        class="cursor-pointer rounded-lg border p-4 transition-colors hover:border-blue-500"
        on={{ click: () => handleClick(project) }}
      >
        <h3 class="m-0 mb-2">{project.name}</h3>
        <div class="text-xs text-foreground-muted">
          Last modified: {DateTime.toDate(project.updatedAt).toLocaleDateString()}
        </div>
      </div>
    );
  };
}

function EmptyState(_handle: Handle) {
  return (props: { onCreateProject: () => void }) => (
    <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div class="mb-4 text-5xl opacity-50">🎵</div>
      <h2 class="m-0 mb-2 text-xl">No projects yet</h2>
      <p class="m-0 mb-6 text-sm">Create your first project to get started</p>
      <Button on={{ click: props.onCreateProject }}>Create Project</Button>
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
      .onInitial(() => <div class="flex items-center justify-center p-16">Loading projects...</div>)
      .onSuccess((projects) => {
        if (projects.length === 0) {
          return <EmptyState onCreateProject={props.onCreateProject} />;
        }

        return (
          <div class="py-16 px-6">
            <div class="mb-6 flex items-center justify-between">
              <h2 class="m-0 text-lg">Your Projects</h2>
              {/* <Button on={{ click: props.onCreateProject }}>New Project</Button> */}
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
        <div class="p-6 text-red-500">Error loading projects: {Cause.pretty(error)}</div>
      ))
      .render() as RemixNode;
  };
}
