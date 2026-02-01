/**
 * @since 1.0.0
 */

import type * as Atom from "@effect-atom/atom/Atom";
import * as Registry from "@effect-atom/atom/Registry";
import type { Handle, RemixNode } from "@remix-run/component";

/**
 * Type alias for an initial value pair with erased types.
 * Each pair represents an atom and its initial value.
 *
 * @since 1.0.0
 * @category types
 */
type AtomInitialValue = readonly [Atom.Atom<unknown>, unknown];

/**
 * @since 1.0.0
 * @category context
 */
export interface RegistryContext {
  readonly registry: Registry.Registry;
}

/**
 * @since 1.0.0
 * @category context
 */
export interface RegistrySetupOptions {
  readonly initialValues?: Iterable<AtomInitialValue> | undefined;
  readonly scheduleTask?: ((f: () => void) => void) | undefined;
  readonly timeoutResolution?: number | undefined;
  readonly defaultIdleTTL?: number | undefined;
}

/**
 * RegistryProvider
 *
 * Remix Component that provides an Effect-Atom Registry via `handle.context`.
 *
 * @example
 * ```tsx
 * import { RegistryProvider } from "@effect-atom/atom-remix"
 *
 * function Root(handle: Handle) {
 *   return () => (
 *     <RegistryProvider
 *       setup={{
 *         defaultIdleTTL: 400,
 *       }}
 *     >
 *       <App />
 *     </RegistryProvider>
 *   )
 * }
 * ```
 *
 * Descendants can access the registry with:
 *
 * ```ts
 * const { registry } = handle.context.get(RegistryProvider)
 * ```
 *
 * @since 1.0.0
 * @category context
 */
export function RegistryProvider(
  handle: Handle<RegistryContext>,
  setup: RegistrySetupOptions | undefined,
) {
  const registry = Registry.make({
    scheduleTask: setup?.scheduleTask ?? ((f) => queueMicrotask(f)),
    initialValues: setup?.initialValues,
    timeoutResolution: setup?.timeoutResolution,
    defaultIdleTTL: setup?.defaultIdleTTL ?? 400,
  });

  // Provide registry to descendants
  handle.context.set({ registry });

  // Dispose when this provider component is disconnected
  handle.signal.addEventListener(
    "abort",
    () => {
      registry.dispose();
    },
    { once: true },
  );

  return (props: { children?: RemixNode }) => props.children ?? null;
}
