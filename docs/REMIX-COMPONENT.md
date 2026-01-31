# Remix Component Guide

Remix components use a **setup/render pattern** that differs from React. This application does NOT use React, Preact, or any other UI framework.

## Getting Started

To start using Remix Component, create a root and render your top-level component:

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

Use Tailwind v4, always reference available theme vars in `@packages/app/src/style.css`.

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

### Pseudo-Selectors and Nested Selectors

Use `&` to reference the current element:

```tsx
function Button() {
  return () => (
    <button
      css={{
        backgroundColor: 'blue',
        '&:hover': { backgroundColor: 'darkblue' },
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      Click me
    </button>
  )
}
```

**Use nested selectors when parent state affects children:**

```tsx
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

### Using queueTask for Reactive Data Loading

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

## Fragments

Use `Fragment` to group elements without adding extra DOM nodes:

```tsx
function List(handle: Handle) {
  return () => (
    <>
      <li>Item 1</li>
      <li>Item 2</li>
    </>
  )
}
```

## Wrapping Components

- Use `Props<'div'>` for extending native elements
- Use `RemixNode` not `JSX.Element`

## File Naming

Always name files using kebab-case with lowercase.

## Testing Components

**Follow TDD (Test-Driven Development):**
1. Write tests first for the component behavior you want
2. Run tests and verify they fail
3. Implement the component
4. Run tests and verify they pass

### Running Tests

```bash
# Run all tests in a package
cd packages/app && bun test

# Run a specific test file
bun test src/components/__tests__/my-component.test.tsx

# Run all tests from root
bun run test
```

### Test Pattern

```tsx
import { describe, expect, it } from "bun:test";
import { createRoot } from "@remix-run/component";
import { MyComponent } from "../my-component";

describe("MyComponent", () => {
  it("renders correctly", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<MyComponent setup={{}} />);
    root.flush(); // Always flush after render

    expect(container.querySelector(".my-element")).not.toBeNull();
  });

  it("updates on click", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    root.render(<MyComponent setup={{}} />);
    root.flush();

    container.querySelector("button")?.click();
    root.flush(); // Flush after events that call handle.update()

    expect(container.querySelector("[data-active]")).not.toBeNull();
  });
});
```

### Key Points

- Always provide `setup` prop (even if empty `setup={{}}`) for components that define a setup parameter
- Call `root.flush()` after `render()` and after events that trigger updates
- Use `dispatchEvent` for focus/blur events in happy-dom
- Test files go in `__tests__/` directory with `.test.tsx` extension
