---
name: building-remix-components
description: Creates Remix UI components with correct setup/render patterns. Use when building new components, converting React to Remix, or debugging component state issues.
---

# Building Remix Components

Read the full guide at docs/REMIX-COMPONENT.md for API details and examples.

## Quick Reference

Components use a **setup/render pattern**:

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

## Key Handle Methods

- `handle.update()` - Schedule re-render after state change
- `handle.queueTask(fn)` - Run work after next DOM update
- `handle.on(target, listeners)` - Add event listeners with auto-cleanup
- `handle.signal` - AbortSignal for component lifecycle
- `handle.context.set/get` - Context for ancestor/descendant communication

## Component Checklist

- [ ] Dynamic values in render props, not setup props
- [ ] Setup props only for initialization
- [ ] `handle.update()` called after state changes
- [ ] Context set in setup phase
- [ ] DOM refs use `connect` prop
- [ ] Event handlers use `on` prop
- [ ] Cleanup uses `handle.signal`
- [ ] Types use `Props<'element'>` and `RemixNode`

## Anti-patterns

**Don't call `handle.update()` before async work in a task:**

```tsx
// ❌ Avoid
handle.queueTask(async (signal) => {
  loading = true
  handle.update() // Aborts signal!
  await fetch('/api', { signal }) // AbortError
})

// ✅ Prefer
handle.queueTask(async (signal) => {
  let response = await fetch('/api', { signal })
  if (signal.aborted) return
  data = await response.json()
  handle.update()
})
```

## Reference

- Full API: docs/REMIX-COMPONENT.md
- Examples: packages/app/src/components/ui/
- Tests: packages/app/src/components/__tests__/
