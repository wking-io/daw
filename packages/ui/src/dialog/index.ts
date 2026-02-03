export * as Dialog from "./index.parts";

export { DialogRoot } from "./root/DialogRoot";
export type {
  DialogRootSetup,
  DialogRootProps,
  DialogRootState,
  DialogRootContextValue,
  DialogModal,
  DialogCloseReason,
} from "./root/DialogRoot";
export { DialogRootDataAttributes } from "./root/DialogRootDataAttributes";

export { DialogTrigger } from "./trigger/DialogTrigger";
export type {
  DialogTriggerSetup,
  DialogTriggerProps,
  DialogTriggerState,
} from "./trigger/DialogTrigger";

export { DialogPortal } from "./portal/DialogPortal";
export type { DialogPortalSetup, DialogPortalProps } from "./portal/DialogPortal";

export { DialogBackdrop } from "./backdrop/DialogBackdrop";
export type {
  DialogBackdropSetup,
  DialogBackdropProps,
  DialogBackdropState,
} from "./backdrop/DialogBackdrop";
export { DialogBackdropDataAttributes } from "./backdrop/DialogBackdropDataAttributes";

export { DialogPopup } from "./popup/DialogPopup";
export type { DialogPopupSetup, DialogPopupProps, DialogPopupState } from "./popup/DialogPopup";
export { DialogPopupDataAttributes } from "./popup/DialogPopupDataAttributes";

export { DialogTitle } from "./title/DialogTitle";
export type { DialogTitleSetup, DialogTitleProps, DialogTitleState } from "./title/DialogTitle";

export { DialogDescription } from "./description/DialogDescription";
export type {
  DialogDescriptionSetup,
  DialogDescriptionProps,
  DialogDescriptionState,
} from "./description/DialogDescription";

export { DialogClose } from "./close/DialogClose";
export type { DialogCloseSetup, DialogCloseProps, DialogCloseState } from "./close/DialogClose";
