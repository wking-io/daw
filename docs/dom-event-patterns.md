---
name: DOM Event Patterns
description: Use before writing DOM event handlers that need element references.
---

## Prefer `e.currentTarget` over stored element refs

When an event handler needs the element it's attached to (e.g. for pointer capture), use `e.currentTarget` instead of storing the element in a variable via `connect`.

`e.currentTarget` is always the element the listener is bound to, so it's guaranteed to exist during the handler. This eliminates stored refs, null checks, and stale reference bugs.

### Type narrowing

`PointerEvent.currentTarget` is typed as `EventTarget | null`. Use `instanceof` to narrow — never use `as`:

```ts
function handlePointerDown(e: PointerEvent) {
  const { currentTarget: el } = e;
  if (!(el instanceof Element)) return;

  el.setPointerCapture(e.pointerId);
}
```

### When a stored ref is still needed

`e.currentTarget` is only available synchronously during event dispatch. A stored ref is required for imperative DOM access outside of events:

- `ResizeObserver`
- Reading/writing `scrollLeft`
- Getting a canvas rendering context
- Any async or scheduled callback (`queueTask`, `requestAnimationFrame`)

### Child-to-parent pointer capture

When a child element's event handler needs to set pointer capture on a parent, navigate via `parentElement` with a null check:

```ts
function handleResizeStart(e: PointerEvent) {
  const { currentTarget } = e;
  if (!(currentTarget instanceof Element) || !currentTarget.parentElement) return;
  const el = currentTarget.parentElement;

  el.setPointerCapture(e.pointerId);
}
```

### Don't expose element refs in context

If a stored ref is only used internally (for `ResizeObserver`, scroll sync, etc.), keep it private. Only expose it in context if children actually need it.
