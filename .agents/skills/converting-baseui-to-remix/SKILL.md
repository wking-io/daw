---
name: converting-baseui-to-remix
description: Converts MUI Base UI components to Remix components. Use when porting Base UI components, creating headless UI components, or asked to implement a component like Base UI.
---

# Converting Base UI to Remix Components

Load `building-remix-components` skill first. Read docs/REMIX-COMPONENT.md for Remix patterns.

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

**Allowed (Functional Styles):**
- Calculated positioning (`top`, `left`)
- Behavioral styles (`userSelect`, `pointerEvents`)
- CSS variables (`--transform-origin`)

**Never Apply:**
- `z-index`, `background`, `color`, `border`, `padding`, `margin`
- Visual Tailwind classes

**Expose state via data attributes:**
```tsx
data-state={open ? "open" : "closed"}
data-side={side}
data-disabled={disabled ? "" : undefined}
```

## Conversion Workflow

1. Study Base UI source: `https://github.com/mui/base-ui/tree/master/packages/react/src/{component}`
2. Map context to `handle.context`
3. Map hooks to setup phase variables
4. Map effects to `handle.on()` or `connect`
5. Map refs to variables + `connect`
6. Controlled values go in render props, not setup props

## Checklist

- [ ] Component is fully headless
- [ ] Only functional styles applied
- [ ] CSS variables exposed for dynamic values
- [ ] Data attributes for all states
- [ ] Controlled values in render props
- [ ] Context uses getters for reactive values
- [ ] Cleanup via `handle.signal`
- [ ] ARIA attributes match Base UI

## Reference

- Existing conversions: packages/app/src/components/ui/
- Base UI source: https://github.com/mui/base-ui
