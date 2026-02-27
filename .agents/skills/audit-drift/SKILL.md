---
context: fork
---

# State Drift Audit

Detect and fix state synchronization issues, impossible states, and state management anti-patterns.

## What This Command Detects

State drift occurs when application state becomes inconsistent, duplicated, or poorly modeled. This leads to subtle bugs where the UI shows stale data, impossible combinations occur, or changes in one place don't propagate to another.

### Categories of State Drift

| Category | Description |
|----------|-------------|
| **Boolean Explosion** | Multiple booleans creating 2^n states, many impossible |
| **Magic Strings** | String literals for status/state instead of enums/constants |
| **Duplicated State** | Same data stored in multiple locations |
| **Derived State Stored** | Computed values stored instead of calculated |
| **Impossible States** | "Bags of optionals" instead of discriminated unions |
| **Status Mismatches** | Database enums not matching code enums |
| **Missing State Machines** | Ad-hoc state transitions instead of explicit FSMs |
| **Single Source of Truth Violations** | Multiple authoritative sources for same data |

## Phase 1: Discover the Codebase

1. **Identify the tech stack**:
   - Frontend framework (React, Vue, Svelte, etc.)
   - State management (Redux, Zustand, Pinia, MobX, Context, etc.)
   - Backend framework (Laravel, Express, Rails, etc.)
   - Database (Postgres, MySQL, SQLite, etc.)
   - ORM/Query builder (Eloquent, Prisma, Drizzle, TypeORM, etc.)

2. **Map state locations**:
   - Frontend state files (stores, reducers, atoms, signals)
   - API response types
   - Database schemas/migrations
   - Shared types between frontend/backend

## Phase 2: Parallel Audit (Using Subagents)

**Launch these subagents in parallel** using `Task` with `subagent_type=Explore`:

---

### Subagent 1: Boolean Explosion & Impossible States

```
Audit this codebase for boolean explosion and impossible state patterns.

Tech stack: [from Phase 1]

## BOOLEAN EXPLOSION
Look for objects/components with multiple boolean flags that could conflict:
- `isLoading && isError` (both true = impossible)
- `isOpen && isClosed` (mutually exclusive)
- `isEditing && isViewing && isDeleting` (should be enum)
- `isValid && hasErrors` (contradictory)

Search patterns:
- Multiple `is[A-Z]` or `has[A-Z]` properties in same interface/type
- State objects with 3+ boolean properties
- Components with multiple boolean state variables

## IMPOSSIBLE STATES (Bags of Optionals)
Find types that allow invalid combinations:

BAD:
```typescript
type State = {
  isLoading?: boolean;
  data?: Data;
  error?: Error;
}
// Allows: { isLoading: true, data: someData, error: someError }
```

GOOD (discriminated union):
```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error }
```

Search for:
- Interfaces with multiple optional properties representing state
- Types with `loading?: boolean` alongside `data?` and `error?`
- Redux/Zustand slices with parallel loading/error/data fields
- React useState with separate `loading`, `error`, `data` states

Report each finding with:
- file:line reference
- The problematic pattern
- Suggested discriminated union refactor
```

---

### Subagent 2: Magic Strings & Status Mismatches

```
Audit this codebase for magic strings and status/enum mismatches.

Tech stack: [from Phase 1]

## MAGIC STRINGS
Find string literals used for state/status that should be enums:

BAD:
```typescript
if (order.status === 'pending') { }
user.role = 'admin';
setStatus('active');
```

GOOD:
```typescript
if (order.status === OrderStatus.Pending) { }
user.role = UserRole.Admin;
setStatus(Status.Active);
```

Search patterns:
- String comparisons: `=== 'pending'`, `=== 'active'`, `=== 'draft'`
- String assignments to status/state/type/role fields
- Switch statements on string values
- Common status words: pending, active, inactive, draft, published, completed, failed, cancelled, approved, rejected

## STATUS MISMATCHES
Find where database enums don't match code enums:

1. Check database migrations/schemas for enum definitions
2. Check code for corresponding enum/const definitions
3. Compare values - are they identical?

Look for:
- Database has 'cancelled' but code uses 'canceled' (spelling)
- Database has 5 values, code has 4 (missing value)
- Database uses snake_case, code uses camelCase
- Prisma/Drizzle schema enums vs TypeScript enums
- Laravel migrations vs PHP enums

Report each finding with:
- file:line reference
- The magic string or mismatch
- Database definition location (if applicable)
- Suggested enum/constant
```

---

### Subagent 3: Duplicated & Derived State

```
Audit this codebase for duplicated and derived state anti-patterns.

Tech stack: [from Phase 1]

## DUPLICATED STATE
Find the same data stored in multiple places:

1. **Direct Entity Duplication**
   - `selectedUser` stored separately from `users` array
   - `currentItem` copied from `items` list
   - Same API response cached in multiple stores/atoms

2. **Implicit State Duplication**
   - `totalCount` stored when it could be `items.length`
   - `isFirstItem` stored when it could be `index === 0`
   - `formattedDate` stored when it could be computed

Search for:
- Variables named `selected*`, `current*`, `active*` that duplicate list items
- Properties named `*Count`, `*Total` alongside arrays
- Same type appearing in multiple store slices

## DERIVED STATE STORED AS STATE
Find computed values stored instead of calculated:

BAD:
```typescript
const [items, setItems] = useState([]);
const [filteredItems, setFilteredItems] = useState([]); // DERIVED!
const [total, setTotal] = useState(0); // DERIVED!

// Has to sync manually:
useEffect(() => {
  setFilteredItems(items.filter(...));
  setTotal(items.reduce(...));
}, [items]);
```

GOOD:
```typescript
const [items, setItems] = useState([]);
const filteredItems = useMemo(() => items.filter(...), [items]);
const total = items.reduce(...);
```

Search for:
- useEffect that only updates derived state
- Redux selectors that read state that could be computed
- State properties that are transformations of other state
- Sync effects (useEffect/watch that copies state to state)

Report each finding with:
- file:line reference
- What is duplicated/derived
- The source of truth it should derive from
- Suggested refactor
```

---

### Subagent 4: State Machine Opportunities

```
Audit this codebase for ad-hoc state transitions that should be state machines.

Tech stack: [from Phase 1]

## COMPLEX STATE TRANSITIONS WITHOUT FSM
Find state that flows through multiple stages without explicit machine:

Signs you need a state machine:
- Multiple related booleans that change together
- Complex conditional logic checking current state before transitions
- Bug-prone "what state are we in?" checks scattered in code
- Transitions that should be invalid but aren't prevented

Search for:
1. **Multi-stage flows**:
   - Wizard/stepper components without step enum
   - Form submission: idle -> validating -> submitting -> success/error
   - Async operations: idle -> loading -> success/error -> idle
   - Auth flows: logged_out -> logging_in -> logged_in -> logging_out

2. **State transition logic**:
   - `if (currentState === 'x' && canTransition)` patterns
   - `switch(status)` with transition logic
   - Guard conditions before state changes

3. **Invalid transition bugs**:
   - Can submit form while already submitting?
   - Can logout while logging in?
   - Can go backwards in wizard when shouldn't?

Look for:
- Multiple setState calls that should be atomic
- Race conditions from missing transition guards
- `status` fields with 4+ possible values (candidate for FSM)

GOOD (explicit state machine):
```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error; retryCount: number }

// Transitions are explicit and validated
function transition(state: State, event: Event): State {
  switch (state.status) {
    case 'idle':
      if (event.type === 'FETCH') return { status: 'loading' };
      return state; // Invalid transition - ignored
    // ...
  }
}
```

Report each finding with:
- file:line reference
- The implicit state flow detected
- States and transitions identified
- Suggested state machine structure
```

---

### Subagent 5: Single Source of Truth Violations

```
Audit this codebase for single source of truth violations.

Tech stack: [from Phase 1]

## MULTIPLE SOURCES OF TRUTH
Find data that exists in multiple authoritative locations:

1. **Frontend/Backend Duplication**
   - User permissions defined in both frontend and backend
   - Validation rules duplicated client and server side
   - Business logic constants in multiple places

2. **Type Definition Duplication**
   - Same interface defined in multiple files
   - API types duplicated between frontend/backend
   - Enum values hardcoded in multiple locations

3. **Configuration Drift**
   - Same config values in .env and code
   - Feature flags in multiple places
   - URL/endpoint definitions scattered

Search for:
- Same interface/type name in multiple files
- Identical enum values defined separately
- Validation schemas duplicated (Zod on client, different on server)
- Constants with same value in multiple files

## CROSS-LAYER STATE INCONSISTENCY
Find where frontend, API, and database can disagree:

1. Check for optimistic updates without proper rollback
2. Find cache invalidation that might miss updates
3. Look for stale closures capturing old state
4. Identify WebSocket/SSE updates racing with REST calls

Search for:
- `mutate()` or `setQueryData()` without proper invalidation
- Optimistic updates in React Query/SWR/TanStack Query
- localStorage/sessionStorage as state (can go stale)
- Multiple API clients that don't share cache

Report each finding with:
- file:line reference
- What has multiple sources
- Which should be the single source
- How to eliminate duplication
```

---

## Phase 3: Prioritize Findings

Categorize by severity:

| Priority | Criteria | Examples |
|----------|----------|----------|
| **P1 Critical** | Causes bugs now | Impossible states reached, data corruption |
| **P2 High** | Will cause bugs | Missing state machine, race conditions likely |
| **P3 Medium** | Tech debt | Magic strings, derived state stored |
| **P4 Low** | Code quality | Minor duplication, naming inconsistencies |

## Phase 4: Present Findings

```markdown
## State Drift Audit Results

### Summary
- X impossible state patterns found
- X magic string usages
- X duplicated state instances
- X state machine opportunities
- X source of truth violations

### P1 Critical - Fix Immediately
| Issue | Location | Pattern | Fix |
|-------|----------|---------|-----|
| ... | file:line | ... | ... |

### P2 High - Fix Soon
...

### P3 Medium - Plan to Fix
...

### P4 Low - Nice to Have
...
```

## Phase 5: Fix Options

Present options to the user:

1. **Fix P1 Critical only** - Address bugs that are likely happening now
2. **Fix P1 + P2** - Critical and high-priority issues
3. **Fix all automatically fixable** - Magic strings, simple discriminated unions
4. **Generate refactor plan** - For state machine implementations
5. **Report only** - Just the audit, no changes

### Automatic Fixes Available

These patterns can be fixed automatically:
- Magic strings → enum/const definitions
- Simple boolean pairs → discriminated union
- Obvious derived state → useMemo/computed
- Duplicate type definitions → single export

### Manual Refactors Required

These need human decision-making:
- State machine design (what are the valid transitions?)
- Source of truth designation (which layer owns the data?)
- Complex discriminated unions (what are all the states?)

## Notes

- Focus on `src/`, `app/`, `lib/` - skip `node_modules/`, `vendor/`
- Check recent changes first: `git diff --name-only HEAD~20`
- Some "duplication" is intentional (denormalization for performance)
- Ask before removing what might be intentional caching
