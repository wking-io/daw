---
name: building-remix-components
description: Creates Remix UI components with correct setup/render patterns. Use when building new components, converting React to Remix, or debugging component state issues.
---

# Building Remix Components

Remix components use a **setup/render pattern** that differs from React. Understanding this pattern is critical for correct component behavior.

## Getting Started

### Creating a Root

```tsx
import { createRoot } from '@remix-run/component'
import type { Handle } from '@remix-run/component'

function App(handle: Handle) {
  return () => (
    <div>
      <h1>Hello, World!</h1>
    </div>
  )
}

let container = document.getElementById('app')!
let root = createRoot(container)
root.render(<App />)
```

### Root Methods

- **`render(node)`** - Renders a component tree into the root container
- **`flush()`** - Synchronously flushes all pending updates and tasks
- **`remove()`** - Removes the component tree and cleans up

## Component Structure

All components follow a two-phase structure:

1. **Setup Phase** - Runs once when the component is first created
2. **Render Phase** - Runs on initial render and every update afterward

```tsx
function MyComponent(handle: Handle, setup: SetupType) {
  // Setup phase: runs once
  let state = initializeState(setup)

  // Return render function: runs on every update
  return (props: Props) => {
    return <div>{/* render content */}</div>
  }
}
```

### Runtime Behavior

1. **First Render**: Component function called with `handle` and `setup` prop, render function stored and called with props
2. **Subsequent Updates**: Only the render function is called, setup phase skipped
3. **Component Removal**: `handle.signal` is aborted, all listeners cleaned up

### Setup vs Props

The `setup` prop is only available in the setup phase and excluded from props:

```tsx
function Counter(handle: Handle, setup: number) {
  let count = setup // setup prop only available here

  return (props: { label: string }) => {
    // props only receives { label } - setup is excluded
    return (
      <div>
        {props.label}: {count}
      </div>
    )
  }
}

let element = <Counter setup={10} label="Count" />
```

## Handle API

### `handle.update(task?)`

Schedules a component update. Optionally accepts a task to run after the update completes.

```tsx
function Counter(handle: Handle) {
  let count = 0

  return () => (
    <button
      on={{
        click() {
          count++
          handle.update()
        },
      }}
    >
      Count: {count}
    </button>
  )
}
```

With a task:

```tsx
function Player(handle: Handle) {
  let isPlaying = false
  let stopButton: HTMLButtonElement

  return () => (
    <button
      disabled={isPlaying}
      on={{
        click() {
          isPlaying = true
          handle.update(() => {
            stopButton.focus()
          })
        },
      }}
    >
      Play
    </button>
  )
}
```

### `handle.queueTask(task)`

Schedules a task to run after the next update. The task receives an `AbortSignal` that's aborted when:
- The component re-renders (new render cycle starts)
- The component is removed from the tree

**Use `queueTask` in event handlers when work needs to happen after DOM changes:**

```tsx
function Form(handle: Handle) {
  let showDetails = false
  let detailsSection: HTMLElement

  return () => (
    <form>
      <input
        type="checkbox"
        checked={showDetails}
        on={{
          change(event) {
            showDetails = event.currentTarget.checked
            handle.update()
            if (showDetails) {
              handle.queueTask(() => {
                detailsSection.scrollIntoView({ behavior: 'smooth' })
              })
            }
          },
        }}
      />
      {showDetails && (
        <section connect={(node) => (detailsSection = node)}>Details content</section>
      )}
    </form>
  )
}
```

**Use `queueTask` for work that needs to be reactive to prop changes:**

```tsx
function DataLoader(handle: Handle) {
  let data: any = null
  let loading = true

  return (props: { url: string }) => {
    handle.queueTask(async (signal) => {
      let response = await fetch(props.url, { signal })
      let json = await response.json()
      if (signal.aborted) return
      data = json
      loading = false
      handle.update()
    })

    if (loading) return <div>Loading...</div>
    return <div>{JSON.stringify(data)}</div>
  }
}
```

**❌ Anti-pattern: Don't create states as values to "react to" on the next render with `queueTask`:**

```tsx
// ❌ Avoid: Creating state just to react to it in queueTask
function BadExample(handle: Handle) {
  let shouldLoad = false

  return () => (
    <div>
      <button
        on={{
          click() {
            shouldLoad = true
            handle.update()
            handle.queueTask(() => {
              if (shouldLoad) {
                // Do work
              }
            })
          },
        }}
      >
        Load
      </button>
    </div>
  )
}

// ✅ Prefer: Do the work directly in the event handler or queueTask
function GoodExample(handle: Handle) {
  return () => (
    <div>
      <button
        on={{
          click() {
            handle.queueTask(() => {
              // Do work directly - no intermediate state needed
            })
          },
        }}
      >
        Load
      </button>
    </div>
  )
}
```

**❌ Anti-pattern: Don't call `handle.update()` before async work in a task:**

```tsx
// ❌ Avoid: Calling handle.update() before async work
handle.queueTask(async (signal) => {
  loading = true
  handle.update() // This triggers a re-render, which aborts signal!

  let response = await fetch('/api/data', { signal }) // AbortError: signal is aborted
})

// ✅ Prefer: Set initial state in setup, only call handle.update() after async work
handle.queueTask(async (signal) => {
  let response = await fetch('/api/data', { signal })
  if (signal.aborted) return

  data = await response.json()
  loading = false
  handle.update() // Safe - async work is complete
})
```

### `handle.signal`

An `AbortSignal` that's aborted when the component is disconnected.

```tsx
function Clock(handle: Handle) {
  let interval = setInterval(handle.update, 1000)
  handle.signal.addEventListener('abort', () => clearInterval(interval))

  return () => <span>{new Date().toString()}</span>
}
```

### `handle.on(target, listeners)`

Listen to an `EventTarget` with automatic cleanup when the component disconnects.

```tsx
function KeyboardTracker(handle: Handle) {
  let keys: string[] = []

  handle.on(document, {
    keydown(event) {
      keys.push(event.key)
      handle.update()
    },
  })

  return () => <div>Keys: {keys.join(', ')}</div>
}
```

### `handle.id`

Stable identifier per component instance for HTML APIs like `htmlFor`, `aria-owns`, etc.

```tsx
function LabeledInput(handle: Handle) {
  return () => (
    <div>
      <label htmlFor={handle.id}>Name</label>
      <input id={handle.id} type="text" />
    </div>
  )
}
```

### `handle.context`

Context API for ancestor/descendant communication.

**Important:** `handle.context.set()` does not cause any updates - it simply stores a value.

```tsx
function App(handle: Handle<{ theme: string }>) {
  handle.context.set({ theme: 'dark' })

  return () => (
    <div>
      <Header />
    </div>
  )
}

function Header(handle: Handle) {
  let { theme } = handle.context.get(App)
  return () => <header css={{ backgroundColor: theme === 'dark' ? '#000' : '#fff' }}>Header</header>
}
```

For granular updates, use `TypedEventTarget`:

```tsx
import { TypedEventTarget } from '@remix-run/interaction'

class Theme extends TypedEventTarget<{ change: Event }> {
  #value: 'light' | 'dark' = 'light'

  get value() {
    return this.#value
  }

  setValue(value: 'light' | 'dark') {
    this.#value = value
    this.dispatchEvent(new Event('change'))
  }
}

function ThemeProvider(handle: Handle<Theme>) {
  let theme = new Theme()
  handle.context.set(theme)

  return (props: { children: RemixNode }) => (
    <div>
      <button on={{ click() { theme.setValue(theme.value === 'light' ? 'dark' : 'light') } }}>
        Toggle Theme
      </button>
      {props.children}
    </div>
  )
}

function ThemedContent(handle: Handle) {
  let theme = handle.context.get(ThemeProvider)
  handle.on(theme, { change() { handle.update() } })

  return () => (
    <div css={{ backgroundColor: theme.value === 'dark' ? '#000' : '#fff' }}>
      Current theme: {theme.value}
    </div>
  )
}
```

## State Management Best Practices

### Use Minimal Component State

Only store state that's needed for rendering. Derive computed values instead of storing them.

```tsx
// ❌ Avoid: Storing computed values
function TodoList(handle: Handle) {
  let todos: Array<{ text: string; completed: boolean }> = []
  let completedCount = 0 // Unnecessary state
}

// ✅ Prefer: Derive computed values in render
function TodoList(handle: Handle) {
  let todos: Array<{ text: string; completed: boolean }> = []

  return () => {
    let completedCount = todos.filter((t) => t.completed).length
    return <div>Completed: {completedCount}</div>
  }
}
```

### Do Work in Event Handlers

Do as much work as possible in event handlers with minimal component state.

```tsx
// ✅ Good: Read input value directly from the form - no component state needed
function SearchForm(handle: Handle) {
  return () => (
    <form
      on={{
        submit(event) {
          event.preventDefault()
          let formData = new FormData(event.currentTarget)
          let query = formData.get('query') as string
          // Use query for search
        },
      }}
    >
      <input name="query" />
      <button type="submit">Search</button>
    </form>
  )
}
```

## CSS Prop

### Performance: CSS Prop vs Style Prop

The `css` prop produces static styles as CSS rules, while the `style` prop applies styles directly. For **dynamic styles**, use the `style` prop:

```tsx
// ✅ Prefer: Using style prop for dynamic styles
function ProgressBar(handle: Handle) {
  let progress = 0

  return () => (
    <div
      css={{ backgroundColor: 'blue' }}  // Static styles in css prop
      style={{ width: `${progress}%` }}  // Dynamic styles in style prop
    >
      {progress}%
    </div>
  )
}
```

### Pseudo-Selectors

Use `&` to reference the current element:

```tsx
function Button() {
  return () => (
    <button
      css={{
        backgroundColor: 'blue',
        '&:hover': { backgroundColor: 'darkblue' },
        '&:active': { transform: 'scale(0.98)' },
        '&:focus': { outline: '2px solid yellow' },
        '&:disabled': { opacity: 0.5 },
      }}
    >
      Click me
    </button>
  )
}
```

### Pseudo-Elements

```tsx
function Badge() {
  return (props: { count: number }) => (
    <div
      css={{
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '8px',
          height: '8px',
          backgroundColor: 'red',
          borderRadius: '50%',
        },
      }}
    >
      {props.count > 0 && <span>{props.count}</span>}
    </div>
  )
}
```

### Nested Selectors

**Use nested selectors when parent state affects children** (prefer this over JavaScript state management):

```tsx
// ❌ Avoid: Managing hover state in JavaScript
function CardWithJSState(handle: Handle) {
  let isHovered = false

  return (props: { children: RemixNode }) => (
    <div
      on={{
        mouseenter() { isHovered = true; handle.update() },
        mouseleave() { isHovered = false; handle.update() },
      }}
      css={{ border: `1px solid ${isHovered ? 'blue' : '#ddd'}` }}
    >
      <div className="title" css={{ color: isHovered ? 'blue' : '#333' }}>Title</div>
    </div>
  )
}

// ✅ Prefer: CSS nested selectors handle state declaratively
function Card(handle: Handle) {
  return (props: { children: RemixNode }) => (
    <div
      css={{
        border: '1px solid #ddd',
        '&:hover': {
          borderColor: 'blue',
          '& .title': { color: 'blue' },
        },
        '& .title': { fontSize: '20px', color: '#333' },
      }}
    >
      <div className="title">Title</div>
    </div>
  )
}
```

### Media Queries

```tsx
function ResponsiveGrid() {
  return (props: { children: RemixNode }) => (
    <div
      css={{
        display: 'grid',
        gap: '16px',
        gridTemplateColumns: '1fr',
        '@media (min-width: 768px)': {
          gridTemplateColumns: 'repeat(2, 1fr)',
        },
        '@media (min-width: 1024px)': {
          gridTemplateColumns: 'repeat(3, 1fr)',
        },
      }}
    >
      {props.children}
    </div>
  )
}
```

## Connect Prop

Use the `connect` prop to get a reference to the DOM node:

```tsx
function Form(handle: Handle) {
  let inputRef: HTMLInputElement

  return () => (
    <form>
      <input type="text" connect={(node) => (inputRef = node)} />
      <button on={{ click() { inputRef.focus() } }}>Focus Input</button>
    </form>
  )
}
```

With cleanup signal:

```tsx
function ResizeTracker(handle: Handle) {
  let dimensions = { width: 0, height: 0 }

  return () => (
    <div
      connect={(node, signal) => {
        let observer = new ResizeObserver((entries) => {
          let entry = entries[0]
          if (entry) {
            dimensions.width = Math.round(entry.contentRect.width)
            dimensions.height = Math.round(entry.contentRect.height)
            handle.update()
          }
        })
        observer.observe(node)
        signal.addEventListener('abort', () => observer.disconnect())
      }}
    >
      Size: {dimensions.width} × {dimensions.height}
    </div>
  )
}
```

## Key Prop

Use the `key` prop to uniquely identify elements in lists:

```tsx
function TodoList(handle: Handle) {
  let todos = [
    { id: '1', text: 'Buy milk' },
    { id: '2', text: 'Walk dog' },
  ]

  return () => (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  )
}
```

Keys ensure:
- **DOM nodes are reused** - Elements with matching keys are moved, not recreated
- **Component state is preserved** - Component instances persist across reorders
- **Focus and selection are maintained** - Input focus stays with the same element

## Controlled vs Uncontrolled Inputs

Only control an input's value when something besides the user's interaction can also control its state.

**Uncontrolled Input** (use when only the user controls the value):

```tsx
function SearchInput(handle: Handle) {
  return () => (
    <input
      type="text"
      on={{
        async input(event, signal) {
          let query = event.currentTarget.value
          // Read value directly - no component state needed
        },
      }}
    />
  )
}
```

**Controlled Input** (use when programmatic control is needed):

```tsx
function SlugForm(handle: Handle) {
  let slug = ''
  let generatedSlug = ''

  return () => (
    <form>
      <label>
        <input
          type="checkbox"
          on={{
            change(event) {
              generatedSlug = event.currentTarget.checked ? crypto.randomUUID().slice(0, 8) : ''
              handle.update()
            },
          }}
        />
        Auto-generate slug
      </label>
      <input
        type="text"
        value={generatedSlug || slug}
        disabled={!!generatedSlug}
        on={{
          input(event) {
            slug = event.currentTarget.value
            handle.update()
          },
        }}
      />
    </form>
  )
}
```

## Data Loading

### Using Event Handler Signals for Race Conditions

Event handlers receive an `AbortSignal` that's aborted when the handler is re-entered or the component is removed:

```tsx
function SearchInput(handle: Handle) {
  let results: string[] = []
  let loading = false

  return () => (
    <div>
      <input
        type="text"
        on={{
          async input(event, signal) {
            let query = event.currentTarget.value
            loading = true
            handle.update()

            let response = await fetch(`/search?q=${query}`, { signal })
            let data = await response.json()
            if (signal.aborted) return

            results = data.results
            loading = false
            handle.update()
          },
        }}
      />
      {loading && <div>Loading...</div>}
    </div>
  )
}
```

### Using Setup Scope for Initial Data

```tsx
function UserProfile(handle: Handle, setup: { userId: string }) {
  let user: User | null = null
  let loading = true

  handle.queueTask(async (signal) => {
    let response = await fetch(`/api/users/${setup.userId}`, { signal })
    let data = await response.json()
    if (signal.aborted) return
    user = data
    loading = false
    handle.update()
  })

  return (props: { showEmail?: boolean }) => {
    if (loading) return <div>Loading user...</div>

    return (
      <div>
        <h1>{user.name}</h1>
        {props.showEmail && <p>{user.email}</p>}
      </div>
    )
  }
}
```

## Setup Scope Use Cases

The setup scope is perfect for one-time initialization:

### Third-Party SDKs

```tsx
function Analytics(handle: Handle, setup: { apiKey: string }) {
  let analytics = new AnalyticsSDK(setup.apiKey)

  handle.signal.addEventListener('abort', () => {
    analytics.disconnect()
  })

  return (props: { event: string; data?: any }) => {
    return <div>Tracking: {props.event}</div>
  }
}
```

### Window/Document Event Handling

```tsx
function WindowResizeTracker(handle: Handle) {
  let width = window.innerWidth
  let height = window.innerHeight

  handle.on(window, {
    resize() {
      width = window.innerWidth
      height = window.innerHeight
      handle.update()
    },
  })

  return () => <div>Window size: {width} × {height}</div>
}
```

## Focus and Scroll Management

Use `handle.queueTask()` in event handlers for DOM operations that need to happen after the DOM has changed:

```tsx
function Modal(handle: Handle) {
  let isOpen = false
  let closeButton: HTMLButtonElement
  let openButton: HTMLButtonElement

  return () => (
    <div>
      <button
        connect={(node) => (openButton = node)}
        on={{
          click() {
            isOpen = true
            handle.update()
            handle.queueTask(() => {
              closeButton.focus()
            })
          },
        }}
      >
        Open Modal
      </button>

      {isOpen && (
        <div role="dialog">
          <button
            connect={(node) => (closeButton = node)}
            on={{
              click() {
                isOpen = false
                handle.update()
                handle.queueTask(() => {
                  openButton.focus()
                })
              },
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
```

## Component Checklist

Before finishing a component, verify:

- [ ] Dynamic values (controlled state) are in render props, not setup props
- [ ] Setup props are only for initialization (`defaultValue`, config)
- [ ] `handle.update()` is called after state changes
- [ ] Context is set in setup phase, not render phase
- [ ] DOM operations use `connect` prop
- [ ] Event handlers use `on` prop with object syntax
- [ ] Cleanup uses `handle.signal`
- [ ] Types use `Props<'element'>` for extending native elements
- [ ] Return type uses `RemixNode`

## File Conventions

- Use kebab-case for file names: `my-component.tsx`
- Export both individual components and compound component object:

```tsx
export function TabsRoot() { ... }
export function TabsTab() { ... }

export const Tabs = {
  Root: TabsRoot,
  Tab: TabsTab,
}
```

## Testing Components

**Follow TDD (Test-Driven Development):** Write tests first, ensure they fail, then implement the component.

### Running Tests

```bash
# Run all tests in the app package
bun test

# Run a specific test file
bun test src/components/__tests__/my-component.test.tsx
```

### Test Setup

Tests use happy-dom for DOM simulation. The setup is in `packages/app/src/__tests__/setup.ts` and configured in `packages/app/bunfig.toml`.

### Test Pattern

```tsx
import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { MyComponent } from "../my-component";

describe("MyComponent", () => {
  it("renders children", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(
      <MyComponent setup={{ defaultValue: "test" }}>
        <span class="child">Content</span>
      </MyComponent>,
    );
    root.flush();

    const child = container.querySelector(".child");
    expect(child).not.toBeNull();
    expect(child?.textContent).toBe("Content");
  });

  it("handles click events", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<MyComponent setup={{}} />);
    root.flush();

    const button = container.querySelector("button");
    button?.click();
    root.flush();

    expect(container.querySelector("[data-active]")).not.toBeNull();
  });

  it("handles focus/blur with events", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<MyComponent setup={{}} />);
    root.flush();

    const input = container.querySelector("input");
    input?.dispatchEvent(new Event("focus", { bubbles: true }));
    root.flush();

    expect(container.querySelector("[data-focused]")).not.toBeNull();
  });
});
```

### Key Testing Points

1. **Always call `root.flush()`** after `render()` and after events that trigger `handle.update()`
2. **Provide `setup` props** for components that require them (even if empty `setup={{}}`)
3. **Use `dispatchEvent`** for focus/blur events in happy-dom
4. **Query the DOM** to verify rendered output and state changes
5. **Test data attributes** (`data-active`, `data-disabled`, etc.) for state verification

### Test File Location

Place tests in `packages/app/src/components/__tests__/` with `.test.tsx` extension:
- Component: `packages/app/src/components/my-component.tsx`
- Test: `packages/app/src/components/__tests__/my-component.test.tsx`

## Reference Examples

Look at existing components in `packages/app/src/components/ui/`:
- `field.tsx` - Form field with validation
- `tabs.tsx` - Tabbed interface with controlled/uncontrolled support
- `popover.tsx` - Popover component

Look at existing tests in `packages/app/src/components/__tests__/`:
- `tabs.test.tsx` - Tests for compound component with context
- `field.test.tsx` - Tests for form field with focus/blur handling
- `popover.test.tsx` - Tests for toggle behavior and portals

## Summary

- **Components** have two phases: setup (runs once) and render (runs after setup and on updates)
- **State** is managed with plain JavaScript variables
- **Updates** are explicit via `handle.update()`
- **Setup prop** initialization values and excluded from props
- **Context** enables indirect composition without prop drilling
- **TypedEventTarget** provides granular updates for better performance
- **State management best practices:**
  - Use minimal component state - derive computed values, don't store input state you don't need
  - Do as much work as possible in event handlers - use event handler scope for transient state, only capture to component state if used for rendering
- **queueTask** patterns:
  - Use in event handlers when work needs to happen after DOM changes from the next update
  - Use in render function for work that needs to be reactive to prop changes
  - Don't create states as values to "react to" on the next render with queueTask
- **AbortSignals** in events and tasks manage interruptions and disconnects - always check `signal.aborted` or pass to async APIs
