import type { Registry } from "@effect-atom/atom-react";
import { logsAtom } from "./atoms";

export function push(registry: Registry.Registry, message: string) {
	registry.update(logsAtom, (prev) => [...prev, message]);
}
