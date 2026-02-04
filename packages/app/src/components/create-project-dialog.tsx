import { getAtom, getAtomSet } from "@daw/atom-remix";
import { ProjectCreate, ProjectCreateCommand } from "@daw/core/commands/command";
import * as Ids from "@daw/core/ids";
import { ProjectVersion } from "@daw/core/versions";
import type { Handle } from "@remix-run/component";
import { ApiClient } from "../api/client";
import { tabsAtom } from "../state/tabs";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field } from "./field";

export function CreateProjectDialog(handle: Handle) {
  const ctx = handle.context.get(Dialog.Root);
  const create = getAtomSet(handle, ApiClient.mutation("project", "create"));
  const [, setTabs] = getAtom(handle, tabsAtom);
  let isSubmitting = false;
  let error: string | null = null;

  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return "Project name is required";
    }
    if (name.length > 100) {
      return "Project name must be 100 characters or less";
    }
    return null;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formEl = e.currentTarget as HTMLFormElement;
    const formData = new FormData(formEl);
    const name = (formData.get("name") as string) ?? "";

    const validationError = validateName(name);
    if (validationError) {
      error = validationError;
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
          name: name.trim(),
          projectId,
        }),
      }),
      reactivityKeys: ["projects"],
    });

    setTabs((current) => ({
      openTabs: [...current.openTabs, { id: projectId, name: name.trim(), state: "idle" }],
      activeTabId: projectId,
    }));
  };

  return () => (
    <Dialog.Popup>
      <Dialog.Title>Create New Project</Dialog.Title>

      <form
        on={{
          submit: handleSubmit,
        }}
      >
        <Field.Root setup={{ name: "name" }} class="mb-4">
          <Field.Label>Project Name</Field.Label>
          <Field.Control
            name="name"
            type="text"
            placeholder="My Project"
            required
            connect={(input: HTMLInputElement) => {
              if (ctx.state === "open") {
                handle.queueTask(() => {
                  input.focus();
                });
              }
            }}
            on={{
              blur: (e: FocusEvent & { currentTarget: HTMLInputElement }) => {
                error = validateName(e.currentTarget.value);
                handle.update();
              },
            }}
          />
          {error && (
            <div
              role="alert"
              class="mt-2 rounded-sm border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </div>
          )}
        </Field.Root>

        <div class="flex justify-end gap-2">
          <Dialog.Close>Cancel</Dialog.Close>
          <Button setup={{ size: "sm" }} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </Dialog.Popup>
  );
}
