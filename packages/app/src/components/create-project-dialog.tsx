import { getAtom, getAtomSet } from "@daw/atom-remix";
import {
  ProjectCreate,
  ProjectCreateCommand,
} from "@daw/core/commands/command";
import * as Ids from "@daw/core/ids";
import { ProjectVersion } from "@daw/core/versions";
import type { Handle } from "@remix-run/component";
import { ApiClient } from "../api/client";
import { tabsAtom } from "../state/tabs";

export function CreateProjectDialog(handle: Handle) {
  const create = getAtomSet(handle, ApiClient.mutation("project", "create"));
  const [, setTabs] = getAtom(handle, tabsAtom);
  let isSubmitting = false;
  let error: string | null = null;
  let onCloseRef: (() => void) | null = null;

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (isSubmitting) return;


    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const name = (formData.get("name") as string)?.trim();

    if (!name) {
      error = "Project name is required";
      handle.update();
      return;
    }

    isSubmitting = true;
    error = null;
    handle.update();

    const projectId = Ids.generate("ProjectId");

    create({
      payload: ProjectCreateCommand.make({
        id: Ids.generate("CommandId"),
        expectedVersion: ProjectVersion.make(0),
        actor: "ui",
        payload: ProjectCreate.make({
          t: "project.create",
          name,
          projectId,
        }),
      }),
      reactivityKeys: ["projects"],
    });

    setTabs((current) => ({
      openTabs: [...current.openTabs, { id: projectId, name, state: "idle" }],
      activeTabId: projectId,
    }));

    onCloseRef?.();
  };

  return (props: { onClose: () => void }) => {
    onCloseRef = props.onClose;

    return (
      <div
        class="fixed inset-0 z-1000 flex items-center justify-center bg-black/70"
        on={{
          click: (e) => {
            if (e.target === e.currentTarget) {
              props.onClose();
            }
          },
        }}
      >
        <div class="w-100 max-w-[90vw] rounded-lg border border-neutral-700 bg-neutral-900 p-6">
          <h2 class="m-0 mb-4 text-lg text-white">Create New Project</h2>

          <form on={{ submit: handleSubmit }}>
            <div class="mb-4">
              <label
                for="project-name"
                class="mb-1.5 block text-sm text-neutral-400"
              >
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                name="name"
                placeholder="My Project"
                class="box-border w-full rounded border border-neutral-600 bg-neutral-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                connect={(input: HTMLInputElement) => {
                  input.focus();
                }}
              />
            </div>

            {error && (
              <div class="mb-4 rounded border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {error}
              </div>
            )}

            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="cursor-pointer rounded border border-neutral-600 bg-transparent px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
                on={{ click: props.onClose }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                class="cursor-pointer rounded border-none bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-blue-500"
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
}
