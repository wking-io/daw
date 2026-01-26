import * as Atom from "@effect-atom/atom/Atom";
import * as Registry from "@effect-atom/atom/Registry";
import type * as Result from "@effect-atom/atom/Result";
import type { Handle } from "@remix-run/component";
import { Effect } from "effect";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import { globalValue } from "effect/GlobalValue";
import { RegistryProvider } from "./registry";

/**
 * Type alias for an atom with erased type parameter.
 * Used for heterogeneous collections where we need to store atoms of different types.
 *
 * @since 1.0.0
 * @category types
 */
type AnyAtom = Atom.Atom<unknown>;

/**
 * Type alias for an initial value pair with erased types.
 * Each pair represents an atom and its initial value.
 *
 * @since 1.0.0
 * @category types
 */
export type AtomInitialValue = readonly [Atom.Atom<unknown>, unknown];

/**
 * Helper to create a type-safe initial value pair.
 * Use this when calling `getAtomInitialValues` to preserve type safety at call sites.
 *
 * @example
 * ```ts
 * getAtomInitialValues(handle, [
 *   atomInitialValue(countAtom, 10),
 *   atomInitialValue(nameAtom, "hello"),
 * ])
 * ```
 *
 * @since 1.0.0
 * @category types
 */
export function atomInitialValue<A>(
	atom: Atom.Atom<A>,
	value: A,
): AtomInitialValue {
	return [atom, value];
}

interface AtomStore<A> {
	readonly subscribe: (listener: () => void) => () => void;
	readonly get: () => A;
}

type AnyStore = AtomStore<unknown>;

const storeRegistry = globalValue(
	"@effect-atom/atom-remix/storeRegistry",
	() => new WeakMap<Registry.Registry, WeakMap<AnyAtom, AnyStore>>(),
);

/**
 * Get or create an AtomStore for the given registry + atom combination.
 *
 * @since 1.0.0
 * @category internal
 */
function makeStore<A>(
	registry: Registry.Registry,
	atom: Atom.Atom<A>,
): AtomStore<A> {
	let stores = storeRegistry.get(registry);
	if (stores === undefined) {
		stores = new WeakMap<AnyAtom, AnyStore>();
		storeRegistry.set(registry, stores);
	}

	const existing = stores.get(atom as AnyAtom);
	if (existing !== undefined) {
		return existing as AtomStore<A>;
	}

	const store: AtomStore<A> = {
		subscribe(listener) {
			return registry.subscribe(atom, listener);
		},
		get() {
			return registry.get(atom);
		},
	};

	stores.set(atom as AnyAtom, store as AnyStore);
	return store;
}

/**
 * Get the current Registry from Remix Component context.
 *
 * Call this in the setup phase of a component.
 *
 * @since 1.0.0
 * @category context
 */
function getRegistry(handle: Handle): Registry.Registry {
	const { registry } = handle.context.get(RegistryProvider);
	return registry;
}

/**
 * Track which atoms have been mounted per registry so we don't double-mount.
 *
 * @since 1.0.0
 * @category internal
 */
const mountedAtoms = globalValue(
	"@effect-atom/atom-remix/mountedAtoms",
	() => new WeakMap<Registry.Registry, WeakSet<AnyAtom>>(),
);

/**
 * Mount an atom in the registry, but only once per registry.
 *
 * @since 1.0.0
 * @category internal
 */
function mountAtomOnce<A>(
	registry: Registry.Registry,
	atom: Atom.Atom<A>,
): void {
	let set = mountedAtoms.get(registry);
	if (set === undefined) {
		set = new WeakSet<AnyAtom>();
		mountedAtoms.set(registry, set);
	}
	if (!set.has(atom as AnyAtom)) {
		set.add(atom as AnyAtom);
		registry.mount(atom);
	}
}

/**
 * Tracks which atoms have already had their initial values applied,
 * per registry, to avoid re-applying on future calls.
 *
 * @since 1.0.0
 * @category internal
 */
const initialValuesSet = globalValue(
	"@effect-atom/atom-remix/initialValuesSet",
	() => new WeakMap<Registry.Registry, WeakSet<AnyAtom>>(),
);

/**
 * Internal interface for accessing the ensureNode capability.
 * This is an internal API of @effect-atom/atom that is not publicly typed.
 *
 * @since 1.0.0
 * @category internal
 */
interface EnsureNodeCapable {
	ensureNode<A>(atom: Atom.Atom<A>): { setValue(value: A): void };
}

/**
 * Access the internal ensureNode method on a registry.
 *
 * @since 1.0.0
 * @category internal
 */
function ensureNode<A>(
	registry: Registry.Registry,
	atom: Atom.Atom<A>,
): { setValue(value: A): void } {
	return (registry as unknown as EnsureNodeCapable).ensureNode(atom);
}

/**
 * Set initial values for atoms in the current Registry.
 *
 * This is the Remix Component equivalent of `getAtomInitialValues` in `atom-react`.
 * Call it in the setup phase (not in the render function).
 *
 * @example
 * ```tsx
 * function Root(handle: Handle) {
 *   getAtomInitialValues(handle, [
 *     atomInitialValue(countAtom, 10),
 *   ])
 *
 *   return () => <App />
 * }
 * ```
 *
 * @since 1.0.0
 * @category hooks
 */
export function getAtomInitialValues(
	handle: Handle,
	initialValues: Iterable<AtomInitialValue>,
): void {
	const registry = getRegistry(handle);
	let set = initialValuesSet.get(registry);
	if (set === undefined) {
		set = new WeakSet<AnyAtom>();
		initialValuesSet.set(registry, set);
	}
	for (const [atom, value] of initialValues) {
		if (!set.has(atom)) {
			set.add(atom);
			ensureNode(registry, atom).setValue(value);
		}
	}
}

/**
 * Read-only atom value helper for Remix Components.
 *
 * Call this in the setup function of a component. It returns a getter
 * that can be used inside the render function to read the latest value.
 *
 * @example
 * ```tsx
 * function Counter(handle: Handle) {
 *   const getCount = getAtomValue(handle, countAtom)
 *
 *   return () => <div>Count: {getCount()}</div>
 * }
 * ```
 *
 * @since 1.0.0
 * @category hooks
 */
export function getAtomValue<A>(handle: Handle, atom: Atom.Atom<A>): () => A;
export function getAtomValue<A>(
	handle: Handle,
	atom: Atom.Atom<A>,
	f: (_: A) => A,
): () => A;
export function getAtomValue<A, B = A>(
	handle: Handle,
	atom: Atom.Atom<A>,
	f?: (_: A) => B,
): () => B {
	const registry = getRegistry(handle);
	const baseAtom: Atom.Atom<B> = f
		? Atom.map(atom, f)
		: (atom as unknown as Atom.Atom<B>);
	mountAtomOnce(registry, baseAtom);

	const store = makeStore(registry, baseAtom);

	let value = store.get();

	const unsubscribe = store.subscribe(() => {
		value = store.get();
		handle.update();
	});

	handle.signal.addEventListener("abort", unsubscribe, { once: true });

	return () => value;
}

type SetValue<R, W> = (value: W | ((value: R) => W)) => void;
type SetPromise<A> = (value: unknown) => Promise<A>;
type SetPromiseExit<A, E> = (value: unknown) => Promise<Exit.Exit<A, E>>;

/**
 * Internal helper to create setters for writable atoms, supporting
 * the same `mode` contract as `atom-react`:
 *
 * - "value"      → fire-and-forget updates
 * - "promise"    → returns a Promise of `Result.Success`
 * - "promiseExit"→ returns a Promise of `Exit<Success, Failure>`
 *
 * @since 1.0.0
 * @category internal
 */
function makeSetAtom<R, W>(
	registry: Registry.Registry,
	atom: Atom.Writable<R, W>,
	options?: { readonly mode?: "value" },
): SetValue<R, W>;
function makeSetAtom<R extends Result.Result<unknown, unknown>, W>(
	registry: Registry.Registry,
	atom: Atom.Writable<R, W>,
	options: { readonly mode: "promise" },
): SetPromise<Result.Result.Success<R>>;
function makeSetAtom<R extends Result.Result<unknown, unknown>, W>(
	registry: Registry.Registry,
	atom: Atom.Writable<R, W>,
	options: { readonly mode: "promiseExit" },
): SetPromiseExit<Result.Result.Success<R>, Result.Result.Failure<R>>;
function makeSetAtom<R, W>(
	registry: Registry.Registry,
	atom: Atom.Writable<R, W>,
	options?: { readonly mode?: "value" | "promise" | "promiseExit" },
): unknown {
	if (options?.mode === "promise") {
		return (value: W) => {
			registry.set(atom, value);
			return Effect.runPromiseExit(
				Registry.getResult(
					registry,
					atom as unknown as Atom.Atom<Result.Result<unknown, unknown>>,
					{ suspendOnWaiting: true },
				),
			).then(flattenExit);
		};
	}

	if (options?.mode === "promiseExit") {
		return (value: W) => {
			registry.set(atom, value);
			return Effect.runPromiseExit(
				Registry.getResult(
					registry,
					atom as unknown as Atom.Atom<Result.Result<unknown, unknown>>,
					{ suspendOnWaiting: true },
				),
			);
		};
	}

	return (value: W | ((value: R) => W)) => {
		registry.set(
			atom,
			typeof value === "function"
				? (value as (current: R) => W)(registry.get(atom))
				: value,
		);
	};
}

/**
 * Flatten an Exit or throw its squashed cause.
 *
 * @since 1.0.0
 * @category internal
 */
function flattenExit<A, E>(exit: Exit.Exit<A, E>): A {
	if (Exit.isSuccess(exit)) return exit.value;
	throw Cause.squash(exit.cause);
}

/**
 * Writable atom setter for Remix Components.
 *
 * Call this in setup. It returns a setter that can be used in render
 * or event handlers to update the atom.
 *
 * @example
 * ```tsx
 * function Counter(handle: Handle) {
 *   const setCount = getAtomSet(handle, countAtom)
 *
 *   return () => (
 *     <button
 *       on={{
 *         click: () => setCount((n) => n + 1),
 *       }}
 *     >
 *       Increment
 *     </button>
 *   )
 * }
 * ```
 *
 * @since 1.0.0
 * @category hooks
 */
export function getAtomSet<R, W>(
	handle: Handle,
	atom: Atom.Writable<R, W>,
	options?: { readonly mode?: "value" },
): SetValue<R, W>;
export function getAtomSet<R extends Result.Result<unknown, unknown>, W>(
	handle: Handle,
	atom: Atom.Writable<R, W>,
	options: { readonly mode: "promise" },
): SetPromise<Result.Result.Success<R>>;
export function getAtomSet<R extends Result.Result<unknown, unknown>, W>(
	handle: Handle,
	atom: Atom.Writable<R, W>,
	options: { readonly mode: "promiseExit" },
): SetPromiseExit<Result.Result.Success<R>, Result.Result.Failure<R>>;
export function getAtomSet<R, W>(
	handle: Handle,
	atom: Atom.Writable<R, W>,
	options?: { readonly mode?: "value" | "promise" | "promiseExit" },
): SetValue<R, W> | SetPromise<unknown> | SetPromiseExit<unknown, unknown> {
	const registry = getRegistry(handle);
	mountAtomOnce(registry, atom);
	if (options?.mode === "promise") {
		return makeSetAtom(
			registry,
			atom as Atom.Writable<Result.Result<unknown, unknown>, W>,
			{ mode: "promise" },
		);
	}
	if (options?.mode === "promiseExit") {
		return makeSetAtom(
			registry,
			atom as Atom.Writable<Result.Result<unknown, unknown>, W>,
			{ mode: "promiseExit" },
		);
	}
	return makeSetAtom(registry, atom);
}

/**
 * Combined get/set helper for Remix Components.
 *
 * Call in setup. Returns a tuple of:
 *
 * - `get`: getter for the current value
 * - `set`: setter for updates (mode-dependent)
 *
 * @example
 * ```tsx
 * function Counter(handle: Handle) {
 *   const [getCount, setCount] = getAtom(handle, countAtom)
 *
 *   return () => (
 *     <button
 *       on={{
 *         click: () => setCount((n) => n + 1),
 *       }}
 *     >
 *       Count: {getCount()}
 *     </button>
 *   )
 * }
 * ```
 *
 * @since 1.0.0
 * @category hooks
 */
export function getAtom<R, W>(
	handle: Handle,
	atom: Atom.Writable<R, W>,
	options?: { readonly mode?: "value" },
): readonly [get: () => R, set: SetValue<R, W>];
export function getAtom<R extends Result.Result<unknown, unknown>, W>(
	handle: Handle,
	atom: Atom.Writable<R, W>,
	options: { readonly mode: "promise" },
): readonly [get: () => R, set: SetPromise<Result.Result.Success<R>>];
export function getAtom<R extends Result.Result<unknown, unknown>, W>(
	handle: Handle,
	atom: Atom.Writable<R, W>,
	options: { readonly mode: "promiseExit" },
): readonly [
	get: () => R,
	set: SetPromiseExit<Result.Result.Success<R>, Result.Result.Failure<R>>,
];
export function getAtom<R, W>(
	handle: Handle,
	atom: Atom.Writable<R, W>,
	options?: { readonly mode?: "value" | "promise" | "promiseExit" },
): readonly [
	get: () => R,
	set: SetValue<R, W> | SetPromise<unknown> | SetPromiseExit<unknown, unknown>,
] {
	const registry = getRegistry(handle);
	mountAtomOnce(registry, atom);
	const get = getAtomValue(handle, atom);
	if (options?.mode === "promise") {
		const set = makeSetAtom(
			registry,
			atom as Atom.Writable<Result.Result<unknown, unknown>, W>,
			{ mode: "promise" },
		);
		return [get, set] as const;
	}
	if (options?.mode === "promiseExit") {
		const set = makeSetAtom(
			registry,
			atom as Atom.Writable<Result.Result<unknown, unknown>, W>,
			{ mode: "promiseExit" },
		);
		return [get, set] as const;
	}
	const set = makeSetAtom(registry, atom);
	return [get, set] as const;
}

/**
 * Refresh an atom in the current registry.
 *
 * Call in setup. Returns a function you can use in render or events
 * to refresh the atom's value.
 *
 * @since 1.0.0
 * @category hooks
 */
export function getAtomRefresh<A>(
	handle: Handle,
	atom: Atom.Atom<A>,
): () => void {
	const registry = getRegistry(handle);
	mountAtomOnce(registry, atom);
	return () => registry.refresh(atom);
}

/**
 * Subscribe to an atom for side effects, without driving re-renders
 * via a getter.
 *
 * Call in setup. The subscription is cleaned up when the component
 * disconnects (via `handle.signal`).
 *
 * @example
 * ```tsx
 * function Logger(handle: Handle) {
 *   getAtomSubscribe(handle, countAtom, (value) => {
 *     console.log("Count changed:", value)
 *   })
 *
 *   return () => null
 * }
 * ```
 *
 * @since 1.0.0
 * @category hooks
 */
export function getAtomSubscribe<A>(
	handle: Handle,
	atom: Atom.Atom<A>,
	f: (_: A) => void,
	options?: { readonly immediate?: boolean },
): void {
	const registry = getRegistry(handle);
	const dispose = registry.subscribe(atom, f, options);
	handle.signal.addEventListener("abort", dispose, { once: true });

	if (options?.immediate) {
		f(registry.get(atom));
	}
}
