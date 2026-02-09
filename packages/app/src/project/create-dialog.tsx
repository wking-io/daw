import { getAtomSet } from "@daw/atom-remix";
import type { Handle } from "@remix-run/component";
import { ProjectCreate } from "@daw/core/commands/command";
import type { DialogRootProps } from "@daw/ui";
import { tabsAtom } from "@app/state/tabs";
import { Dialog } from "@app/components/dialog";
import { CloseIcon } from "@daw/ui/icons";
import { CreateProjectForm } from "./create-form";

export function CreateDialogRoot() {
  return (props: DialogRootProps) => <Dialog.Root {...props} />;
}

export function CreateDialogPopup(handle: Handle) {
  const ctx = handle.context.get(Dialog.Root);
  const setTabs = getAtomSet(handle, tabsAtom);

  const addTabOnCreate = ({ projectId, name }: ProjectCreate) => {
    setTabs((current) => ({
      openTabs: [...current.openTabs, { id: projectId, name: name.trim(), state: "idle" }],
      activeTabId: projectId,
    }));

    ctx.close();
  };

  return () => (
    <Dialog.Portal class="create-project-dialog">
      <Dialog.Popup>
        <Dialog.Header class="justify-between items-center">
          <Dialog.Title>Create New Project</Dialog.Title>
          <Dialog.Close>
            <CloseIcon size="sm" />
          </Dialog.Close>
        </Dialog.Header>
        <Dialog.Body>
          <CreateProjectForm setup={{ onCreate: addTabOnCreate }} />
        </Dialog.Body>
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

export const CreateProjectDialog = {
  Root: CreateDialogRoot,
  Popup: CreateDialogPopup,
};
