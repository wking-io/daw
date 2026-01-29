import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { Field } from "../ui/field";

describe("Field", () => {
	describe("Root", () => {
		it("renders children", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<span class="test-child">Content</span>
				</Field.Root>,
			);
			root.flush();

			const child = container.querySelector(".test-child");
			expect(child).not.toBeNull();
			expect(child?.textContent).toBe("Content");
		});

		it("applies custom class", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}} class="custom-field">
					<span>Content</span>
				</Field.Root>,
			);
			root.flush();

			const el = container.querySelector(".custom-field");
			expect(el).not.toBeNull();
		});

		it("sets data-disabled when disabled", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{ disabled: true }}>
					<span>Content</span>
				</Field.Root>,
			);
			root.flush();

			const el = container.querySelector("[data-disabled]");
			expect(el).not.toBeNull();
		});
	});

	describe("Label", () => {
		it("renders as label element with htmlFor", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Label>Username</Field.Label>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const label = container.querySelector("label");
			expect(label).not.toBeNull();
			expect(label?.textContent).toBe("Username");
			expect(label?.htmlFor).toBeTruthy();
		});

		it("label htmlFor matches control id", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Label>Username</Field.Label>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const label = container.querySelector("label");
			const input = container.querySelector("input");
			expect(label?.htmlFor).toBe(input?.id ?? "");
		});
	});

	describe("Control", () => {
		it("renders input element", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const input = container.querySelector("input");
			expect(input).not.toBeNull();
		});

		it("is disabled when field is disabled", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{ disabled: true }}>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const input = container.querySelector("input");
			expect(input?.disabled).toBe(true);
		});

		it("sets name attribute from field", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{ name: "username" }}>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const input = container.querySelector("input");
			expect(input?.name).toBe("username");
		});

		it("sets data-touched after blur", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const input = container.querySelector("input");
			expect(input).not.toBeNull();

			input?.dispatchEvent(new Event("focus", { bubbles: true }));
			root.flush();

			input?.dispatchEvent(new Event("blur", { bubbles: true }));
			root.flush();

			const touchedEl = container.querySelector("[data-touched]");
			expect(touchedEl).not.toBeNull();
		});

		it("sets data-focused while focused", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const input = container.querySelector("input");
			input?.dispatchEvent(new Event("focus", { bubbles: true }));
			root.flush();

			const focusedEl = container.querySelector("[data-focused]");
			expect(focusedEl).not.toBeNull();
		});

		it("sets data-filled when input has value", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const input = container.querySelector("input") as HTMLInputElement;
			expect(input).not.toBeNull();

			input.value = "test";
			input.dispatchEvent(new Event("input", { bubbles: true }));
			root.flush();

			const filledEl = container.querySelector("[data-filled]");
			expect(filledEl).not.toBeNull();
		});

		it("sets data-dirty when value changes from initial", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Control />
				</Field.Root>,
			);
			root.flush();

			const input = container.querySelector("input") as HTMLInputElement;
			input.value = "changed";
			input.dispatchEvent(new Event("input", { bubbles: true }));
			root.flush();

			const dirtyEl = container.querySelector("[data-dirty]");
			expect(dirtyEl).not.toBeNull();
		});
	});

	describe("Description", () => {
		it("renders description text", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Description>Enter your username</Field.Description>
				</Field.Root>,
			);
			root.flush();

			const desc = container.querySelector("p");
			expect(desc).not.toBeNull();
			expect(desc?.textContent).toBe("Enter your username");
		});

		it("has an id on the description element", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Control />
					<Field.Description>Help text</Field.Description>
				</Field.Root>,
			);
			root.flush();

			const desc = container.querySelector("p");
			expect(desc?.id).toBeTruthy();
			expect(desc?.id?.startsWith("field-description-")).toBe(true);
		});
	});

	describe("Error", () => {
		it("does not render when field is valid", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Control />
					<Field.Error>Error message</Field.Error>
				</Field.Root>,
			);
			root.flush();

			const error = container.querySelector("[role='alert']");
			expect(error).toBeNull();
		});

		it("renders when forceShow is true", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{}}>
					<Field.Control />
					<Field.Error forceShow>Forced error</Field.Error>
				</Field.Root>,
			);
			root.flush();

			const error = container.querySelector("[role='alert']");
			expect(error).not.toBeNull();
			expect(error?.textContent).toBe("Forced error");
		});

		it("renders when field is externally marked invalid", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{ invalid: true }}>
					<Field.Control />
					<Field.Error>Invalid field</Field.Error>
				</Field.Root>,
			);
			root.flush();

			const dataInvalid = container.querySelector("[data-invalid]");
			expect(dataInvalid).not.toBeNull();
		});
	});

	describe("integration", () => {
		it("renders complete field with all parts", () => {
			const container = document.createElement("div");
			const root = createRoot(container);

			root.render(
				<Field.Root setup={{ name: "email" }}>
					<Field.Label>Email</Field.Label>
					<Field.Control type="email" placeholder="Enter email" />
					<Field.Description>We'll never share your email</Field.Description>
				</Field.Root>,
			);
			root.flush();

			expect(container.querySelector("label")).not.toBeNull();
			expect(container.querySelector("input")).not.toBeNull();
			expect(container.querySelector("p")).not.toBeNull();

			const input = container.querySelector("input");
			expect(input?.type).toBe("email");
			expect(input?.placeholder).toBe("Enter email");
			expect(input?.name).toBe("email");
		});
	});
});
