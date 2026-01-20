import { Atom } from "@effect-atom/atom-react";

/** Server health status */
export const readyAtom = Atom.make<boolean>(false);

/** SSE connection status */
export const connectedAtom = Atom.make<boolean>(false);
