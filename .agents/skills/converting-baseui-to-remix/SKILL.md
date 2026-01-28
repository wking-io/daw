---
name: converting-baseui-to-remix
description: Converts MUI Base UI components to Remix components. Use when porting Base UI components, creating headless UI components, or asked to implement a component like Base UI.
---

# Converting Base UI to Remix Components

This skill compounds with `building-remix-components`. Load both when converting Base UI components.

## Overview

MUI Base UI (https://github.com/mui/base-ui) provides headless, unstyled React components. When converting to Remix, follow these patterns.

## Key Differences

| Base UI (React) | Remix |
|-----------------|-------|
| `useState` | Variables in setup phase |
| `useContext` | `handle.context.get(Provider)` |
| `createContext` | `handle.context.set(value)` |
| `useEffect` | `handle.on()` or `connect` prop |
| `useRef` | Variables + `connect` prop |
| `forwardRef` | `connect` prop callback |
| Props change on re-render | Render props (not setup props) |

## Headless Component Rules

Base UI is **fully headless**. Your Remix components must be too:

### ✅ Allowed (Functional Styles)

```tsx
style={{
  // Calculated positioning (functional)
  top: `${position.top}px`,
  left: `${position.left}px`,
  
  // Behavioral styles
  userSelect: "none",
  WebkitUserSelect: "none",
  pointerEvents: isHover ? "none" : undefined,
  
  // CSS variables for consumers
  "--transform-origin": origin,
  "--available-width": `${width}px`,
}}
```

### ❌ Never Apply

- `z-index` - Always consumer's responsibility
- `background`, `color`, `border` - Visual styles
- `padding`, `margin` - Spacing
- `position: fixed` on backdrops - Consumer provides
- `outline: none` - Accessibility concern
- Any Tailwind classes for visuals

### Data Attributes for Styling

Expose state via data attributes so consumers can style with CSS:

```tsx
data-state={open ? "open" : "closed"}
data-side={side}
data-align={align}
data-orientation={orientation}
data-disabled={disabled ? "" : undefined}
data-active={active ? "" : undefined}
```

## Conversion Pattern

### 1. Study Base UI Source

```
https://github.com/mui/base-ui/tree/master/packages/react/src/{component}
```

Key files to examine:
- `{Component}Root.tsx` - Main container, context provider
- `{Component}Context.ts` - Context shape
- `use{Component}.ts` - Core hook logic
- `{Component}DataAttributes.ts` - Data attributes applied

### 2. Map Context

**Base UI:**
```tsx
const TabsContext = React.createContext<TabsContextValue | null>(null);

function TabsRoot({ children, value, onValueChange }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      {children}
    </TabsContext.Provider>
  );
}
```

**Remix:**
```tsx
function TabsRoot(
  handle: Handle<TabsContextValue>,
  setup: { defaultValue?: TabValue },
) {
  let internalValue = setup.defaultValue ?? null;
  
  handle.context.set({
    get value() { return internalValue; },
    // ...
  });
  
  return (props: { children: RemixNode }) => (
    <div>{props.children}</div>
  );
}
```

### 3. Map Hooks to Setup Phase

**Base UI:**
```tsx
function useTabsRoot(params) {
  const [value, setValue] = React.useState(params.defaultValue);
  const tabsRef = React.useRef(new Map());
  // ...
}
```

**Remix:**
```tsx
function TabsRoot(handle: Handle<Context>, setup: Setup) {
  // State becomes variables
  let value = setup.defaultValue ?? null;
  const tabs = new Map();
  
  // Callbacks reference these variables
  const setValue = (newValue) => {
    value = newValue;
    handle.update();
  };
  // ...
}
```

### 4. Map Effects

**Base UI:**
```tsx
React.useEffect(() => {
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
```

**Remix:**
```tsx
// In setup phase
handle.on(window, { resize: handleResize });

// Or with connect for element-specific
return () => (
  <div
    connect={(el, signal) => {
      window.addEventListener("resize", handleResize, { signal });
    }}
  />
);
```

### 5. Map Refs

**Base UI:**
```tsx
const triggerRef = React.useRef<HTMLElement>(null);
<button ref={triggerRef}>Trigger</button>
```

**Remix:**
```tsx
let triggerElement: HTMLElement | null = null;

return () => (
  <button
    connect={(el) => { triggerElement = el; }}
  >
    Trigger
  </button>
);
```

### 6. Controlled vs Uncontrolled

Dynamic values (controlled state) must be in render props:

```tsx
function ComponentRoot(
  handle: Handle<ContextValue>,
  setup: { defaultValue?: Value },  // Initialization only
) {
  let internalValue = setup.defaultValue ?? null;
  let isControlled = false;
  let controlledValue: Value | null = null;
  let currentOnChange: ((v: Value) => void) | undefined;

  const getCurrentValue = () => 
    isControlled ? controlledValue : internalValue;

  return (props: {
    value?: Value;              // Controlled value (render prop)
    onChange?: (v: Value) => void;  // Callback (render prop)
    children: RemixNode;
  }) => {
    // Update on every render
    isControlled = props.value !== undefined;
    controlledValue = props.value ?? null;
    currentOnChange = props.onChange;

    return <div>{props.children}</div>;
  };
}
```

## Component Structure

```tsx
import type { Handle, Props, RemixNode } from "@remix-run/component";

// Types
export type ComponentValue = string | number;

export interface ComponentState {
  active: boolean;
  disabled: boolean;
}

// Context interface
export interface ComponentContextValue {
  value: ComponentValue | null;
  onValueChange: (value: ComponentValue) => void;
  // ...
}

// Helper for data attributes
function getDataAttributes(state: ComponentState): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (state.active) attrs["data-active"] = "";
  if (state.disabled) attrs["data-disabled"] = "";
  return attrs;
}

// Root component (context provider)
export function ComponentRoot(
  handle: Handle<ComponentContextValue>,
  setup: { defaultValue?: ComponentValue },
) {
  // Setup phase: state, registrations, callbacks
  
  handle.context.set({ /* context value */ });
  
  return (props: { children: RemixNode; class?: string }) => {
    // Render phase
    return (
      <div class={props.class}>
        {props.children}
      </div>
    );
  };
}

// Child components (context consumers)
export function ComponentItem(
  handle: Handle,
  setup: { value: ComponentValue },
) {
  const ctx = handle.context.get(ComponentRoot);
  const id = generateId("item");
  
  // Registration with cleanup
  if (ctx) {
    ctx.register(setup.value, id);
    handle.signal.addEventListener("abort", () => {
      ctx.unregister(setup.value);
    });
  }
  
  return (props: Props<"button"> & { class?: string }) => {
    const { class: className, children, ...rest } = props;
    const dataAttrs = getDataAttributes({ /* state */ });
    
    return (
      <button
        id={id}
        class={className}
        {...dataAttrs}
        {...rest}
      >
        {children}
      </button>
    );
  };
}

// Compound export
export const Component = {
  Root: ComponentRoot,
  Item: ComponentItem,
};
```

## Checklist

Before finishing a Base UI conversion:

- [ ] Component is fully headless (no visual styles)
- [ ] Only functional styles applied (positioning, pointer-events, user-select)
- [ ] CSS variables exposed for dynamic values (`--transform-origin`, etc.)
- [ ] Data attributes for all states (`data-state`, `data-side`, etc.)
- [ ] Controlled values in render props, not setup props
- [ ] Context properly mapped with getters for reactive values
- [ ] Cleanup via `handle.signal` for registrations
- [ ] All subcomponents use `Props<"element">` for prop spreading
- [ ] ARIA attributes match Base UI implementation
- [ ] Keyboard navigation implemented if applicable

## Reference

Existing converted components:
- `packages/app/src/components/ui/field.tsx` - Form field
- `packages/app/src/components/ui/tabs.tsx` - Tabs with keyboard nav
- `packages/app/src/components/ui/popover.tsx` - Popover with positioning
