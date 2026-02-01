import { getAtomValue, Result } from "@daw/atom-remix";
import type * as Ids from "@daw/core/ids";
import type { Handle, RemixNode } from "@remix-run/component";
import { Cause } from "effect";
import { ApiClient } from "../api/client";

type ProjectId = Ids.ProjectId;

export function ProjectView(handle: Handle, setup: { projectId: ProjectId }) {
  const getResult = getAtomValue(
    handle,
    ApiClient.query("project", "get", {
      path: { projectId: setup.projectId },
    }),
  );

  return (_props: { projectId: ProjectId }) => {
    const result = getResult();

    return Result.builder(result)
      .onInitial(() => (
        <div class="flex h-full items-center justify-center text-neutral-500">
          Loading project...
        </div>
      ))
      .onSuccess((project) => (
        <div class="h-full overflow-auto p-6">
          <div class="mb-6 border-b border-neutral-700 pb-4">
            <h2 class="m-0 mb-2 text-2xl font-semibold text-white">{project.name}</h2>
            <div class="flex gap-4 text-sm text-neutral-500">
              <span>BPM: {project.bpm}</span>
              <span>
                Time Signature: {project.timeSignature.numerator}/
                {project.timeSignature.denominator}
              </span>
              <span>Tracks: {project.tracks.length}</span>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            {project.tracks.length === 0 ? (
              <div class="rounded-lg border border-dashed border-neutral-700 bg-neutral-900 p-12 text-center text-neutral-500">
                No tracks yet. Add a track to get started.
              </div>
            ) : (
              project.tracks.map((track) => (
                <div
                  key={track.id}
                  class="flex items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3"
                >
                  <div class="h-8 w-1 rounded-sm bg-blue-500" />
                  <div>
                    <div class="text-sm font-medium text-white">{track.name}</div>
                    <div class="text-xs text-neutral-500">{track.type}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))
      .onFailure((error) => (
        <div class="p-6 text-red-500">Error loading project: {Cause.pretty(error)}</div>
      ))
      .render() as RemixNode;
  };
}
