A DAW (Digital Audio Workstation) built with Electron, Bun, and Remix Components.

## Desktop App

The primary desktop app is `packages/desktop`.

## Package Manager

Use bun. If a dependency is only used by one package, install it locally; otherwise use catalog for version consistency.

## Commands

- Lint: `bun run lint`
- Format: `bun run fmt`
- Test: `bun run test`

## Key Conventions

- No React. Use Remix Components (see docs/REMIX-COMPONENT.md)
- File names: kebab-case
- Prefer Bun over Node.js

## Packages

- `packages/ui` - Headless UI components (no styles, only behavior and data attributes)
- `packages/app` - Application with styled components that use the headless UI base

## Agent References

- Logging: docs/logging-best-practices.md
- DOM events: docs/dom-event-patterns.md
