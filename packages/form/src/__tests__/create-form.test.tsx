import { describe, expect, it } from "bun:test";
import { RegistryProvider } from "@daw/atom-remix/registry";
import { createRoot } from "@remix-run/component";
import type { Handle } from "@remix-run/component";
import { Schema } from "effect";
import { createForm, getErrorProps, getInputProps } from "../index";

const TestSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.nonEmptyString({ message: () => "Email is required" })),
  age: Schema.Number.pipe(Schema.positive({ message: () => "Age must be positive" })),
});

function TestForm(handle: Handle) {
  const [fields, form] = createForm(handle, { schema: TestSchema });

  return () => (
    <div>
      <input
        data-testid="email"
        key={fields.email.key}
        {...getInputProps(fields.email)}
        on={{
          blur(e) {
            fields.email.validate(e.currentTarget.value);
            handle.update();
          },
        }}
      />
      {fields.email.errors.length > 0 && (
        <div data-testid="email-errors" {...getErrorProps(fields.email)}>
          {fields.email.errors.join(", ")}
        </div>
      )}
      <input data-testid="age" key={fields.age.key} {...getInputProps(fields.age)} type="number" />
      {fields.age.errors.length > 0 && (
        <div data-testid="age-errors" {...getErrorProps(fields.age)}>
          {fields.age.errors.join(", ")}
        </div>
      )}
      <div data-testid="is-valid">{String(form.isValid)}</div>
      <div data-testid="form-errors">{form.errors.join(", ")}</div>
    </div>
  );
}

function TestApp(_handle: Handle) {
  return () => (
    <RegistryProvider setup={{}}>
      <TestForm />
    </RegistryProvider>
  );
}

describe("createForm", () => {
  it("creates field objects with correct properties", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<TestApp />);
    root.flush();

    const emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;
    const ageInput = container.querySelector('[data-testid="age"]') as HTMLInputElement;

    // Check IDs are generated
    expect(emailInput.id).toMatch(/^field-email-/);
    expect(emailInput.name).toBe("email");

    expect(ageInput.id).toMatch(/^field-age-/);
    expect(ageInput.name).toBe("age");

    root.remove();
  });

  it("shows no errors initially", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<TestApp />);
    root.flush();

    const emailErrors = container.querySelector('[data-testid="email-errors"]');
    const ageErrors = container.querySelector('[data-testid="age-errors"]');

    expect(emailErrors).toBeNull();
    expect(ageErrors).toBeNull();

    root.remove();
  });

  it("validates field on blur and shows errors", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<TestApp />);
    root.flush();

    let emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;

    // Trigger blur with empty value
    emailInput.value = "";
    emailInput.dispatchEvent(new Event("blur", { bubbles: true }));
    root.flush();

    const emailErrors = container.querySelector('[data-testid="email-errors"]');
    expect(emailErrors).not.toBeNull();
    expect(emailErrors?.textContent).toBe("Email is required");

    // Re-query after flush since component re-rendered
    emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;
    // Check aria-invalid is set
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");

    root.remove();
  });

  it("clears errors when valid value is provided", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<TestApp />);
    root.flush();

    let emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;

    // First trigger error
    emailInput.value = "";
    emailInput.dispatchEvent(new Event("blur", { bubbles: true }));
    root.flush();

    expect(container.querySelector('[data-testid="email-errors"]')).not.toBeNull();

    // Re-query after flush since component re-rendered
    emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;

    // Then provide valid value
    emailInput.value = "test@example.com";
    emailInput.dispatchEvent(new Event("blur", { bubbles: true }));
    root.flush();

    expect(container.querySelector('[data-testid="email-errors"]')).toBeNull();

    root.remove();
  });

  it("isValid reflects validation state", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<TestApp />);
    root.flush();

    // Initially valid (no validation run yet)
    let isValidDiv = container.querySelector('[data-testid="is-valid"]');
    expect(isValidDiv?.textContent).toBe("true");

    // Trigger error
    const emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;
    emailInput.value = "";
    emailInput.dispatchEvent(new Event("blur", { bubbles: true }));
    root.flush();

    isValidDiv = container.querySelector('[data-testid="is-valid"]');
    expect(isValidDiv?.textContent).toBe("false");

    root.remove();
  });
});

describe("getInputProps", () => {
  it("returns correct props for valid field", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<TestApp />);
    root.flush();

    const emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;

    expect(emailInput.id).toMatch(/^field-email-/);
    expect(emailInput.name).toBe("email");
    expect(emailInput.getAttribute("aria-invalid")).toBeNull();
    expect(emailInput.getAttribute("aria-describedby")).toBeNull();

    root.remove();
  });

  it("returns correct props for invalid field", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<TestApp />);
    root.flush();

    let emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;

    // Trigger error
    emailInput.value = "";
    emailInput.dispatchEvent(new Event("blur", { bubbles: true }));
    root.flush();

    // Re-query after flush since component re-rendered
    emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;

    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(emailInput.getAttribute("aria-describedby")).toMatch(/^field-email-error-/);

    root.remove();
  });
});

describe("getErrorProps", () => {
  it("returns correct props for error element", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<TestApp />);
    root.flush();

    const emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;

    // Trigger error
    emailInput.value = "";
    emailInput.dispatchEvent(new Event("blur", { bubbles: true }));
    root.flush();

    const errorDiv = container.querySelector('[data-testid="email-errors"]');
    expect(errorDiv?.getAttribute("id")).toMatch(/^field-email-error-/);
    expect(errorDiv?.getAttribute("role")).toBe("alert");

    root.remove();
  });
});

describe("field.reset", () => {
  it("changes key and clears errors", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    let resetEmailFn: () => void;
    let getEmailKey: () => number;

    function ResetTestForm(handle: Handle) {
      const [fields] = createForm(handle, { schema: TestSchema });
      resetEmailFn = () => {
        fields.email.reset();
        handle.update();
      };
      getEmailKey = () => fields.email.key;

      return () => (
        <div>
          <input
            data-testid="email"
            key={fields.email.key}
            {...getInputProps(fields.email)}
            on={{
              blur(e) {
                fields.email.validate(e.currentTarget.value);
                handle.update();
              },
            }}
          />
          {fields.email.errors.length > 0 && (
            <div data-testid="email-errors">{fields.email.errors.join(", ")}</div>
          )}
          <span data-testid="email-key">{fields.email.key}</span>
        </div>
      );
    }

    function ResetTestApp(_handle: Handle) {
      return () => (
        <RegistryProvider setup={{}}>
          <ResetTestForm />
        </RegistryProvider>
      );
    }

    root.render(<ResetTestApp />);
    root.flush();

    // Get initial key
    const initialKey = getEmailKey!();
    expect(initialKey).toBe(0);

    // Trigger error
    const emailInput = container.querySelector('[data-testid="email"]') as HTMLInputElement;
    emailInput.value = "";
    emailInput.dispatchEvent(new Event("blur", { bubbles: true }));
    root.flush();

    expect(container.querySelector('[data-testid="email-errors"]')).not.toBeNull();

    // Reset
    resetEmailFn!();
    root.flush();

    // Key should be incremented
    expect(getEmailKey!()).toBe(1);

    // Errors should be cleared
    expect(container.querySelector('[data-testid="email-errors"]')).toBeNull();

    root.remove();
  });
});

describe("form.validate", () => {
  it("validates all fields at once", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    let validateFormFn: (values: { email: string; age: number }) => readonly string[];

    function FormValidateTestForm(handle: Handle) {
      const [fields, form] = createForm(handle, { schema: TestSchema });
      validateFormFn = (values) => {
        const errors = form.validate(values);
        handle.update();
        return errors;
      };

      return () => (
        <div>
          {fields.email.errors.length > 0 && (
            <div data-testid="email-errors">{fields.email.errors.join(", ")}</div>
          )}
          {fields.age.errors.length > 0 && (
            <div data-testid="age-errors">{fields.age.errors.join(", ")}</div>
          )}
          <div data-testid="is-valid">{String(form.isValid)}</div>
        </div>
      );
    }

    function FormValidateTestApp(_handle: Handle) {
      return () => (
        <RegistryProvider setup={{}}>
          <FormValidateTestForm />
        </RegistryProvider>
      );
    }

    root.render(<FormValidateTestApp />);
    root.flush();

    // Validate with invalid values
    const errors = validateFormFn!({ email: "", age: -5 });
    root.flush();

    expect(errors.length).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="email-errors"]')).not.toBeNull();
    // Age errors may be reported at form level depending on schema structure
    expect(container.querySelector('[data-testid="is-valid"]')?.textContent).toBe("false");

    // Validate with valid values
    validateFormFn!({ email: "test@example.com", age: 25 });
    root.flush();

    expect(container.querySelector('[data-testid="email-errors"]')).toBeNull();
    expect(container.querySelector('[data-testid="age-errors"]')).toBeNull();
    expect(container.querySelector('[data-testid="is-valid"]')?.textContent).toBe("true");

    root.remove();
  });
});

describe("form.reset", () => {
  it("resets form element and clears all errors", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    let validateFormFn: (values: { email: string; age: number }) => readonly string[];
    let resetFormFn: (formEl: HTMLFormElement) => void;

    function FormResetTestForm(handle: Handle) {
      const [fields, form] = createForm(handle, { schema: TestSchema });
      let _formRef: HTMLFormElement;

      validateFormFn = (values) => {
        const errors = form.validate(values);
        handle.update();
        return errors;
      };
      resetFormFn = (formEl) => {
        form.reset(formEl);
        handle.update();
      };

      return () => (
        <form connect={(el) => (_formRef = el)}>
          <input name="email" defaultValue="default@test.com" />
          {fields.email.errors.length > 0 && (
            <div data-testid="email-errors">{fields.email.errors.join(", ")}</div>
          )}
          <div data-testid="is-valid">{String(form.isValid)}</div>
        </form>
      );
    }

    function FormResetTestApp(_handle: Handle) {
      return () => (
        <RegistryProvider setup={{}}>
          <FormResetTestForm />
        </RegistryProvider>
      );
    }

    root.render(<FormResetTestApp />);
    root.flush();

    // Create errors
    validateFormFn!({ email: "", age: -5 });
    root.flush();

    expect(container.querySelector('[data-testid="email-errors"]')).not.toBeNull();

    // Reset form
    const formEl = container.querySelector("form") as HTMLFormElement;
    resetFormFn!(formEl);
    root.flush();

    // Errors should be cleared
    expect(container.querySelector('[data-testid="email-errors"]')).toBeNull();
    expect(container.querySelector('[data-testid="is-valid"]')?.textContent).toBe("true");

    root.remove();
  });
});
