import { ApiClient } from "@app/api/client";
import { getAtomSet } from "@daw/atom-remix";
import type { Handle } from "@remix-run/component";
import * as Ids from "@daw/core/ids";
import { ProjectVersion } from "@daw/core/versions";
import { ProjectCreate, ProjectCreateCommand } from "@daw/core/commands/command";
import { Field } from "@app/components/field";
import { Button } from "@app/components/button";

export function CreateProjectForm(
  handle: Handle,
  setup?: { onCreate?: (createCommand: ProjectCreate) => void },
) {
  const create = getAtomSet(handle, ApiClient.mutation("project", "create"));
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
    const createCommand = ProjectCreate.make({
      t: "project.create",
      name: name.trim(),
      projectId,
    });

    create({
      payload: ProjectCreateCommand.make({
        id: Ids.generate("CommandId"),
        expectedVersion: ProjectVersion.make(0),
        actor: "ui",
        payload: createCommand,
      }),
      reactivityKeys: ["projects"],
    });

    setup?.onCreate?.(createCommand);
  };

  return () => (
    <form
      on={{
        submit: handleSubmit,
      }}
    >
      <div class="flex flex-wrap gap-1">
        <Field.Root setup={{ name: "name" }} class="flex-1">
          <Field.Label class="sr-only">Project Name</Field.Label>
          <Field.Control
            name="name"
            type="text"
            placeholder="Enter project name"
            required
            connect={(el: HTMLInputElement) => el.focus()}
            on={{
              blur: (e: FocusEvent & { currentTarget: HTMLInputElement }) => {
                error = validateName(e.currentTarget.value);
                handle.update();
              },
            }}
          />
        </Field.Root>
        <Button type="submit" disabled={isSubmitting} setup={{ color: "layer" }}>
          {isSubmitting ? "Creating..." : "Create Project"}
        </Button>
        {error && (
          <div
            role="alert"
            class="w-full rounded-sm border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {error}
          </div>
        )}
      </div>
    </form>
  );
}
