---
context: fork
---

# Dead Code Audit

Detect unused exports, unreachable code, orphaned files, and stale feature flags.

## The Core Problem

Dead code degrades comprehensibility and introduces maintenance risk. Research (Romano et al., IEEE TSE 2020) found dead code persists for many commits before removal and is "rarely revived." It confuses developers, increases bundle size, and creates false dependencies.

## What This Command Detects

| Pattern | Confidence | Description |
|---------|------------|-------------|
| **Unreachable Code** | 100% | Code after return/throw/break |
| **Unused Imports** | 90% | Imported but never referenced |
| **Orphaned Files** | 85% | Files unreachable from entry points |
| **Unused Exports** | 60% | Exported but never imported elsewhere |
| **Commented-out Code** | 70% | Old code left in comments |
| **Stale Feature Flags** | 80% | Flags at 100%/0% for extended periods |

## Phase 1: Discover the Codebase

1. **Identify entry points**:
   - Package.json main/exports/bin
   - Index files (index.ts, index.js, __init__.py)
   - Framework entry points (app.ts, main.py, App.vue)
   - Route definitions
   - Test entry points

2. **Build dependency graph**:
   - Parse all imports/requires
   - Map exports to their consumers
   - Identify re-exports

3. **Identify framework patterns**:
   - Route handlers (may look unused but are dynamically invoked)
   - Lifecycle hooks
   - Decorators and annotations
   - Plugin architectures

## Phase 2: Parallel Audit (Using Subagents)

**Launch these subagents in parallel** using `Task` with `subagent_type=Explore`:

---

### Subagent 1: Unreachable Code (100% Confidence)

```
Audit this codebase for unreachable code that can be safely removed.

Tech stack: [from Phase 1]

## UNREACHABLE AFTER CONTROL FLOW (100% confidence)
Code following these statements is unreachable:
- return
- throw / raise
- break (in loops/switch)
- continue
- process.exit() / sys.exit() / os.Exit()

Examples:
```typescript
function example() {
  return result;
  console.log("Never runs");  // UNREACHABLE - delete
}

function another() {
  if (error) {
    throw new Error("Failed");
    cleanup();  // UNREACHABLE - delete
  }
}
```

## ALWAYS-TRUE/FALSE CONDITIONS (100% confidence)
```typescript
if (true) { }           // Condition always true
if (false) { }          // Block never executes
while (false) { }       // Loop never runs
if (x && false) { }     // Always false
if (x || true) { }      // Always true
```

## DUPLICATE BRANCHES (High confidence)
```typescript
if (condition) {
  return x;
} else if (condition) {  // Same condition - second branch unreachable
  return y;
}
```

## DEAD SWITCH CASES
```typescript
switch (status) {
  case 'active': return handle();
  case 'active': return other();  // Duplicate case - unreachable
}
```

Report each finding with:
- file:line reference
- The unreachable code
- Why it's unreachable
- Safe to delete: YES (100% confidence)
```

---

### Subagent 2: Unused Imports & Exports

```
Audit this codebase for unused imports and exports.

Tech stack: [from Phase 1]

## UNUSED IMPORTS (90% confidence)
Find imports where the imported symbol is never used:

```typescript
import { debounce } from 'lodash';  // Imported
// debounce() never called anywhere in file → UNUSED

import React from 'react';  // May be needed for JSX even if not explicitly used
```

Search strategy:
1. Parse all import statements
2. For each imported symbol, search for references in the file
3. Flag symbols with zero references

## UNUSED EXPORTS (60% confidence)
Find exports never imported by other files:

```typescript
// utils.ts
export function helperA() { }  // Used in 3 files
export function helperB() { }  // NEVER imported anywhere
```

Search strategy:
1. Catalog all exported symbols with their file paths
2. Search entire codebase for imports of each symbol
3. Flag exports with zero external references

What counts as "used":
- Direct import: `import { fn } from './module'`
- Namespace import: `import * as mod from './module'`
- Re-export: `export { fn } from './module'`
- Dynamic import: `import('./module')`

## FALSE POSITIVES - Don't flag:
- Exports from package entry points (index.ts, main)
- Exports with @public, @api JSDoc tags
- Exports matching framework patterns (React components, Vue composables)
- Type-only exports in declaration files
- Exports used in tests (if production-only audit)

Report each finding with:
- file:line reference
- The unused import/export
- Confidence level
- Suggested action: remove or verify
```

---

### Subagent 3: Orphaned Files

```
Audit this codebase for files not reachable from any entry point.

Tech stack: [from Phase 1]
Entry points: [from Phase 1]

## ORPHANED FILE DETECTION (85% confidence)
A file is orphaned if no import path leads to it from entry points:

Algorithm:
1. Start from entry points (index files, main, app)
2. Recursively follow all imports
3. Mark each file as "reachable"
4. Files never marked are orphaned

## ORPHAN CATEGORIES

**Completely orphaned** (High confidence):
- Not imported anywhere
- Not an entry point
- Not in special directories

**Potentially orphaned** (Medium confidence):
- Only imported by other orphaned files
- Only imported by test files
- Only imported dynamically (string path)

## FALSE POSITIVES - Don't flag:
- Test files (*_test.*, *.spec.*, __tests__/*)
- Config files (*.config.js, .eslintrc, etc.)
- Build scripts
- Migration files
- Seed/fixture files
- Type declaration files (*.d.ts)
- Files in special directories:
  - /scripts/
  - /migrations/
  - /seeds/
  - /fixtures/
  - /generators/
  - /.storybook/

## DYNAMIC IMPORT DETECTION
Look for patterns that may load orphaned files:
```typescript
// These make static analysis harder
import(`./modules/${name}`)
require(dynamicPath)
glob.sync('**/*.handler.ts')
```

Flag dynamic imports as "may use orphaned files"

Report each finding with:
- file path
- Why it's considered orphaned
- Files that import it (if any)
- Confidence level
- Suggested action: delete or verify
```

---

### Subagent 4: Commented-out Code

```
Audit this codebase for commented-out code that should be deleted.

Tech stack: [from Phase 1]

## COMMENTED CODE DETECTION (70% confidence)
Distinguish code comments from documentation comments:

POSITIVE indicators (likely code):
- Contains keywords: if, for, while, return, class, function, def, const, let, var
- Contains operators: {, }, ;, =, ==, ===, ++, --, =>
- Contains function calls: word()
- Contains method chains: foo.bar.baz
- High ratio of identifiers to natural words
- Matches code patterns: variable = value, function(args)

NEGATIVE indicators (likely documentation):
- JSDoc/docstring patterns: /**, @param, @return, '''
- Natural language sentences with proper grammar
- Same character repeated (/* ========= */)
- URLs or email addresses
- TODO/FIXME/NOTE markers (handled by audit-todos)
- License headers

## EXAMPLES

COMMENTED CODE (flag):
```typescript
// const oldValue = calculate();
// if (oldValue > threshold) {
//   return oldValue;
// }

/*
function deprecatedHelper() {
  return this.data.map(x => x * 2);
}
*/
```

NOT CODE (don't flag):
```typescript
// This function calculates the total price including tax
// See: https://example.com/pricing-docs

/**
 * @param userId - The user's unique identifier
 * @returns The user object or null
 */
```

## AGE-BASED PRIORITY
Use git blame to find age:
- >30 days old: Higher priority (stale)
- >90 days old: Very high priority (forgotten)
- >1 year old: Critical (definitely dead)

## LARGE BLOCKS
Flag large commented blocks (>5 lines) with higher priority - these are significant dead code.

Report each finding with:
- file:line reference
- The commented code snippet
- Age (from git blame)
- Size (lines)
- Confidence level
- Suggested action: delete (recoverable via git)
```

---

### Subagent 5: Stale Feature Flags & Dead Conditionals

```
Audit this codebase for stale feature flags and dead conditional branches.

Tech stack: [from Phase 1]

## STALE FEATURE FLAGS (80% confidence)
Based on Uber's Piranha research, flag features that:
- Are at 100% or 0% rollout
- Haven't been modified in 30+ days
- Have one-sided rules (all traffic to single variation)

Common feature flag patterns:
```typescript
// LaunchDarkly
if (ldClient.variation('feature-x', false)) { }

// Custom flags
if (process.env.FEATURE_X_ENABLED === 'true') { }
if (config.features.newCheckout) { }

// Feature flag libraries
if (unleash.isEnabled('feature-x')) { }
if (flagsmith.hasFeature('feature-x')) { }
```

## DETECTION STRATEGY
1. Find feature flag checks in code
2. Look for flags that are:
   - Always true: `if (true)`, `if (FEATURE_ALWAYS_ON)`
   - Always false: `if (false)`, `if (FEATURE_DISABLED)`
   - Environment-specific but current env is known

## DEAD FEATURE CODE
When a flag is removed but code remains:
```typescript
// Flag removed, but both branches still exist
const useNewCheckout = true;  // Was a flag, now hardcoded
if (useNewCheckout) {
  newCheckout();
} else {
  oldCheckout();  // DEAD - flag is always true
}
```

## CONSTANT CONDITIONALS
Find conditionals that always evaluate the same:
```typescript
const DEBUG = false;
if (DEBUG) {
  console.log('debug info');  // Never runs in production
}

const IS_PROD = process.env.NODE_ENV === 'production';
if (!IS_PROD && false) {  // Always false
  enableDevTools();
}
```

## ENV-BASED DEAD CODE
Code that only runs in environments that don't exist:
```typescript
if (process.env.NODE_ENV === 'staging') {
  // If there's no staging environment, this is dead
}
```

Report each finding with:
- file:line reference
- The stale flag or dead conditional
- Current value (if determinable)
- Age of last modification
- Code that can be removed
- Suggested cleanup
```

---

## Phase 3: Confidence-Based Actions

| Confidence | Action | Automation |
|------------|--------|------------|
| **100%** | Auto-remove safe | Can delete without review |
| **90%** | Brief review | Quick check, usually safe |
| **85%** | Check for dynamic usage | Verify no runtime loading |
| **70%** | Manual review | May be intentional |
| **60%** | Flag for discussion | Could break things |

## Phase 4: Present Findings

```markdown
## Dead Code Audit Results

### Summary
- X unreachable code blocks (100% safe to delete)
- X unused imports (90% confidence)
- X orphaned files (85% confidence)
- X unused exports (60% confidence)
- X commented code blocks (70% confidence)
- X stale feature flags (80% confidence)

### Estimated Impact
- Lines removable: ~X
- Files deletable: X
- Bundle size reduction: ~X KB (estimate)

### 100% Confidence - Auto-remove Safe
| Location | Type | Code |
|----------|------|------|
| file:line | Unreachable after return | `console.log(...)` |

### 90% Confidence - Brief Review
| Location | Type | Symbol |
|----------|------|--------|
| file:line | Unused import | `debounce` |

### 85% Confidence - Check Dynamic Usage
| File | Reason | Imported By |
|------|--------|-------------|
| utils/old.ts | No static imports | None |

### 60-70% Confidence - Manual Review Required
| Location | Type | Notes |
|----------|------|-------|
| file:line | Unused export | May be public API |
```

## Phase 5: Fix Options

1. **Auto-remove 100% confidence**:
   - Delete unreachable code
   - Run tests to verify

2. **Remove with review**:
   - Delete unused imports (90%)
   - Delete orphaned files (85%)
   - Run full test suite

3. **Flag for deprecation**:
   - Add @deprecated to unused exports
   - Set removal timeline

4. **Generate cleanup PR**:
   - Batch safe deletions
   - Separate risky deletions

5. **Report only**:
   - Export findings for team review

## Framework-Specific False Positive Rules

### React/Next.js
- Don't flag: Components (may be dynamically routed)
- Don't flag: Pages in /pages or /app directory
- Don't flag: API routes

### Express/Fastify
- Don't flag: Route handlers
- Don't flag: Middleware functions
- Check: Plugin/extension files

### Vue/Nuxt
- Don't flag: Components (may be auto-imported)
- Don't flag: Composables in /composables
- Don't flag: Pages in /pages

### Python/Django/Flask
- Don't flag: Views (URL routed)
- Don't flag: Management commands
- Don't flag: Migrations
- Check: Celery tasks

### Laravel/PHP
- Don't flag: Controllers (routed)
- Don't flag: Jobs, Events, Listeners
- Don't flag: Blade components
- Check: Service providers

## Notes

- Run tests after any deletion
- Commented code is recoverable via git history
- Some "dead" code is intentional (future use, A/B tests)
- Dynamic imports make static analysis incomplete
- Consider running in CI to catch new dead code
