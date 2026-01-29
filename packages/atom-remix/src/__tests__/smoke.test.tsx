import { describe, expect, it } from "bun:test";
import type { Handle } from "@remix-run/component";
import { createRoot } from "@remix-run/component";
import {
	atomInitialValue,
	getAtom,
	getAtomInitialValues,
	getAtomRefresh,
	getAtomSet,
	getAtomSubscribe,
	getAtomValue,
} from "../handlers";
import { Atom } from "../index";
import { RegistryProvider } from "../registry";

const countAtom = Atom.make(0);
const nameAtom = Atom.make("hello");

describe("atom-remix smoke test", () => {
	it("RegistryProvider renders children", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		root.render(
			<RegistryProvider setup={{}}>
				<span class="child">Content</span>
			</RegistryProvider>,
		);
		root.flush();

		const child = container.querySelector(".child");
		expect(child).not.toBeNull();
		expect(child?.textContent).toBe("Content");
	});

	it("getAtomValue reads atom value", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		function TestComponent(handle: Handle) {
			const getCount = getAtomValue(handle, countAtom);
			return () => <span class="count">{getCount()}</span>;
		}

		root.render(
			<RegistryProvider setup={{}}>
				<TestComponent setup={{}} />
			</RegistryProvider>,
		);
		root.flush();

		const count = container.querySelector(".count");
		expect(count?.textContent).toBe("0");
	});

	it("getAtomSet updates atom value", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		function TestComponent(handle: Handle) {
			const getCount = getAtomValue(handle, countAtom);
			const setCount = getAtomSet(handle, countAtom);

			return () => (
				<button
					type="button"
					class="btn"
					on={{
						click: () => {
							setCount((n) => n + 1);
							handle.update();
						},
					}}
				>
					{getCount()}
				</button>
			);
		}

		root.render(
			<RegistryProvider setup={{}}>
				<TestComponent setup={{}} />
			</RegistryProvider>,
		);
		root.flush();

		const btn = container.querySelector(".btn") as HTMLButtonElement;
		expect(btn?.textContent).toBe("0");

		btn.click();
		root.flush();

		expect(btn?.textContent).toBe("1");
	});

	it("getAtom returns getter and setter tuple", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		function TestComponent(handle: Handle) {
			const [getCount, setCount] = getAtom(handle, countAtom);

			return () => (
				<button
					type="button"
					class="btn"
					on={{
						click: () => {
							setCount((n) => n + 1);
							handle.update();
						},
					}}
				>
					{getCount()}
				</button>
			);
		}

		root.render(
			<RegistryProvider setup={{}}>
				<TestComponent setup={{}} />
			</RegistryProvider>,
		);
		root.flush();

		const btn = container.querySelector(".btn") as HTMLButtonElement;
		expect(btn?.textContent).toBe("0");

		btn.click();
		root.flush();

		expect(btn?.textContent).toBe("1");
	});

	it("getAtomInitialValues sets initial values", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		const localCountAtom = Atom.make(0);

		function TestComponent(handle: Handle) {
			getAtomInitialValues(handle, [atomInitialValue(localCountAtom, 42)]);
			const getCount = getAtomValue(handle, localCountAtom);

			return () => <span class="count">{getCount()}</span>;
		}

		root.render(
			<RegistryProvider setup={{}}>
				<TestComponent setup={{}} />
			</RegistryProvider>,
		);
		root.flush();

		const count = container.querySelector(".count");
		expect(count?.textContent).toBe("42");
	});

	it("getAtomRefresh returns a refresh function", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		function TestComponent(handle: Handle) {
			const refresh = getAtomRefresh(handle, countAtom);
			return () => (
				<button type="button" class="btn" on={{ click: () => refresh() }}>
					Refresh
				</button>
			);
		}

		root.render(
			<RegistryProvider setup={{}}>
				<TestComponent setup={{}} />
			</RegistryProvider>,
		);
		root.flush();

		const btn = container.querySelector(".btn");
		expect(btn).not.toBeNull();
	});

	it("getAtomSubscribe subscribes to atom changes", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		const values: number[] = [];
		const localAtom = Atom.make(0);

		function TestComponent(handle: Handle) {
			getAtomSubscribe(handle, localAtom, (value) => {
				values.push(value);
			});
			const setCount = getAtomSet(handle, localAtom);

			return () => (
				<button
					type="button"
					class="btn"
					on={{
						click: () => {
							setCount((n) => n + 1);
						},
					}}
				>
					Click
				</button>
			);
		}

		root.render(
			<RegistryProvider setup={{}}>
				<TestComponent setup={{}} />
			</RegistryProvider>,
		);
		root.flush();

		const btn = container.querySelector(".btn") as HTMLButtonElement;
		btn.click();
		root.flush();

		expect(values).toContain(1);
	});

	it("getAtomValue with transform function", () => {
		const container = document.createElement("div");
		const root = createRoot(container);

		function TestComponent(handle: Handle) {
			const getDoubled = getAtomValue(handle, countAtom, (n) => n * 2);
			return () => <span class="doubled">{getDoubled()}</span>;
		}

		root.render(
			<RegistryProvider setup={{}}>
				<TestComponent setup={{}} />
			</RegistryProvider>,
		);
		root.flush();

		const doubled = container.querySelector(".doubled");
		expect(doubled?.textContent).toBe("0");
	});

	it("atomInitialValue helper creates correct tuple", () => {
		const result = atomInitialValue(nameAtom, "world");
		expect(result[0]).toBe(nameAtom);
		expect(result[1]).toBe("world");
	});
});
