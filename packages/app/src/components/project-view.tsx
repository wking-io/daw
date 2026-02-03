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
        <div class="flex h-full items-center justify-center">Loading project...</div>
      ))
      .onSuccess((project) => (
        <div class="h-full overflow-auto p-6">
          <div class="mb-6 border-b pb-4">
            <h2 class="m-0 mb-2 text-2xl font-semibold">{project.name}</h2>
            <div class="flex gap-4 text-sm">
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
              <div class="rounded-lg border border-dashed p-12 text-center">
                No tracks yet. Add a track to get started.
              </div>
            ) : (
              project.tracks.map((track) => (
                <div key={track.id} class="flex items-center gap-3 rounded-md border px-4 py-3">
                  <div class="h-8 w-1 rounded-sm" />
                  <div>
                    <div class="text-sm">{track.name}</div>
                    <div class="text-xs">{track.type}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))
      .onFailure((error) => (
        <div class="flex h-full items-center justify-center p-6">
          <div class="max-w-md rounded-lg border p-6 flex flex-col items-center">
            <div class="">⚠</div>
            <h3 class="m-0 mb-2 text-lg">Failed to load project</h3>
            <p class="m-0 mb-4 text-sm">Something went wrong while fetching the project data.</p>
            <details class="text-left">
              <summary class="cursor-pointer text-xs">Technical details</summary>
              <pre class="mt-2 overflow-auto rounded p-3 text-xs">{Cause.pretty(error)}</pre>
            </details>
          </div>
        </div>
      ))
      .render() as RemixNode;
  };
}
