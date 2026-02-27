---
context: fork
---

# Names Audit

Detect vague, inconsistent, and confusing identifier names that hurt code comprehension.

## The Core Problem

Research by Butler et al. found **statistically significant associations** between flawed identifier names and bugs. Naming quality directly impacts code comprehension and defect rates.

## What This Command Detects

| Pattern | Description |
|---------|-------------|
| **Vague Generic Names** | data, info, item, thing, handler, manager |
| **Single-letter Variables** | Non-idiomatic use of i, j, x outside loops/math |
| **Missing Boolean Prefixes** | `loading` instead of `isLoading` |
| **Negative Booleans** | `isNotDisabled`, `hasNoErrors` causing double-negation |
| **Casing Inconsistency** | Mixed camelCase/snake_case in same codebase |
| **Abbreviation Inconsistency** | Both `btn` and `button` in same codebase |

## Phase 1: Discover the Codebase

1. **Identify the tech stack**:
   - Language (determines casing conventions)
   - Framework (React props, Express req/res, etc.)
   - Domain (math, networking, graphics)

2. **Infer naming conventions**:
   - Dominant casing for variables, functions, classes, constants
   - Common abbreviations used
   - Domain-specific terminology

## Phase 2: Parallel Audit (Using Subagents)

**Launch these subagents in parallel** using `Task` with `subagent_type=Explore`:

---

### Subagent 1: Vague Generic Names

```
Audit this codebase for vague and generic identifier names.

Tech stack: [from Phase 1]

## ALWAYS FLAG THESE NAMES
These are almost always too vague:
```
data, info, item, thing, stuff, misc, foo, bar, baz,
temp, tmp, val, value, obj, object, element, node,
ret, retval, rv, output, input
```

## FLAG IF STANDALONE (needs qualification)
These need a qualifier to be meaningful:
```
result, response, request, handler, processor, manager,
controller, helper, util, service, factory, wrapper,
list, array, map, set, dict, collection
```

GOOD: `userResult`, `apiResponse`, `formHandler`
BAD: `result`, `response`, `handler`

## CONTEXT RULES
"result" is acceptable:
- As local variable in functions <=15 lines
- With immediate use (returned on next line)

"result" is problematic:
- As module-level variable
- When scope spans >20 lines
- When multiple "result" variables exist in same scope

## SEARCH STRATEGY
1. Find variable/parameter/property declarations
2. Check if name matches vague list
3. Check scope size and usage distance
4. Flag with context about where it's used

Examples:
```typescript
// BAD - vague in large scope
function processOrder(data: any) {  // What data?
  const result = transform(data);   // What result?
  const info = fetchInfo();         // What info?
  return { data, result, info };
}

// GOOD - qualified names
function processOrder(orderData: OrderInput) {
  const transformedOrder = transform(orderData);
  const shippingInfo = fetchShippingInfo();
  return { orderData, transformedOrder, shippingInfo };
}
```

Report each finding with:
- file:line reference
- The vague name
- Its scope size
- Suggested qualified alternatives
```

---

### Subagent 2: Single-letter Variables

```
Audit this codebase for inappropriate single-letter variable names.

Tech stack: [from Phase 1]

## ALLOWED SINGLE-LETTER USES
```javascript
ALLOWED = {
  'i', 'j', 'k', 'n', 'm': // Loop indices only
    context: ["for", "while", "forEach", "map", "reduce"],

  'e': // Exception or event
    context: ["catch", "addEventListener", "on*"],

  'x', 'y', 'z': // Mathematical coordinates
    context: ["math", "geometry", "graphics", "animation"],

  '_': // Intentionally unused
    context: ["callback", "lambda", "destructuring"],

  'T', 'K', 'V', 'U': // Generic type parameters
    context: ["type", "interface", "generic"]
}
```

## FLAG THESE USES
- Single-letter in public API (function params, return types)
- Single-letter with scope >10 lines
- Single-letter outside allowed contexts
- Multiple same single-letter in same scope

Examples:
```typescript
// BAD - 'u' in public API
function getUser(u: string): User { ... }

// BAD - 'd' with large scope
function processData() {
  const d = fetchData();
  // ... 30 lines later ...
  return transform(d);  // What was 'd' again?
}

// GOOD - 'i' in loop
for (let i = 0; i < items.length; i++) { ... }

// GOOD - 'e' in catch
catch (e) { logger.error(e); }
```

Report each finding with:
- file:line reference
- The single-letter variable
- Its scope and context
- Suggested descriptive name
```

---

### Subagent 3: Boolean Naming Issues

```
Audit this codebase for boolean naming problems.

Tech stack: [from Phase 1]

## MISSING BOOLEAN PREFIX (High)
Booleans should have predicative names:

VALID PREFIXES:
```
is, are, was, were, has, have, had,
can, could, should, would, will, did,
does, do, allows, needs, requires
```

NEEDS PREFIX - flag these as standalone boolean names:
```
loading, loaded, active, visible, enabled, disabled,
valid, invalid, empty, open, closed, connected,
authenticated, selected, checked, ready, pending,
complete, done, finished, success, error, failed
```

Examples:
```typescript
// BAD
const loading = true;
const visible = false;
const authenticated = checkAuth();

// GOOD
const isLoading = true;
const isVisible = false;
const isAuthenticated = checkAuth();
```

## NEGATIVE BOOLEANS (Critical)
Negative booleans cause double-negation confusion:

FLAG THESE PATTERNS:
```regex
/^isNot[A-Z]/     → isNotValid, isNotReady
/^hasNo[A-Z]/     → hasNoErrors, hasNoItems
/^not[A-Z]/       → notFound, notAllowed
/^(un|in|dis)[a-z]+/  → inactive, invalid, disabled (as variable names)
```

BAD - causes double negation:
```typescript
if (!isNotDisabled) { }   // Triple negative!
if (!hasNoErrors) { }     // Confusing
const isInvalid = !validate();  // Then: if (!isInvalid)
```

GOOD - use positive form:
```typescript
if (isEnabled) { }
if (hasErrors) { }
const isValid = validate();
```

## BOOLEAN FUNCTIONS WITHOUT PREDICATE
Functions returning boolean should read as questions:

```typescript
// BAD
function checkPermission(): boolean { }
function validateEmail(): boolean { }

// GOOD
function hasPermission(): boolean { }
function isValidEmail(): boolean { }
```

Report each finding with:
- file:line reference
- The problematic boolean name
- Negation issues if present
- Suggested positive form
```

---

### Subagent 4: Casing Inconsistency

```
Audit this codebase for naming convention inconsistencies.

Tech stack: [from Phase 1]

## CASING PATTERNS
```javascript
PATTERNS = {
  camelCase: /^[a-z][a-zA-Z0-9]*$/,      // variables, functions
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,     // classes, types, components
  snake_case: /^[a-z][a-z0-9_]*$/,       // python, ruby, some configs
  SCREAMING_SNAKE: /^[A-Z][A-Z0-9_]*$/,  // constants
  kebab-case: /^[a-z][a-z0-9-]*$/        // file names, CSS
}
```

## CONVENTION INFERENCE
1. Sample identifiers by category (variables, functions, classes, constants)
2. Determine dominant convention for each category
3. Flag deviations from dominant pattern

## COMMON VIOLATIONS
```typescript
// Mixed casing in same file
const user_name = "John";      // snake_case
const userEmail = "j@x.com";   // camelCase - inconsistent!

// Class with wrong casing
class userService { }          // Should be UserService

// Constant without SCREAMING_SNAKE
const maxRetries = 3;          // Should be MAX_RETRIES
```

## LANGUAGE-SPECIFIC CONVENTIONS
| Language | Variables | Functions | Classes | Constants |
|----------|-----------|-----------|---------|-----------|
| JavaScript/TypeScript | camelCase | camelCase | PascalCase | SCREAMING_SNAKE |
| Python | snake_case | snake_case | PascalCase | SCREAMING_SNAKE |
| Java | camelCase | camelCase | PascalCase | SCREAMING_SNAKE |
| Go | camelCase | PascalCase (exported) | PascalCase | camelCase |
| Ruby | snake_case | snake_case | PascalCase | SCREAMING_SNAKE |

Report each finding with:
- file:line reference
- The inconsistent identifier
- Expected convention (based on language/codebase)
- Suggested fix
```

---

### Subagent 5: Abbreviation Inconsistency

```
Audit this codebase for inconsistent abbreviation usage.

Tech stack: [from Phase 1]

## COMMON ABBREVIATION PAIRS
```javascript
PAIRS = {
  "btn": "button",
  "msg": "message",
  "req": "request",
  "res": "response",
  "err": "error",
  "ctx": "context",
  "cfg": "config",
  "conf": "config",
  "idx": "index",
  "num": "number",
  "cnt": "count",
  "auth": "authentication",
  "params": "parameters",
  "args": "arguments",
  "info": "information",
  "init": "initialize",
  "max": "maximum",
  "min": "minimum",
  "prev": "previous",
  "curr": "current",
  "src": "source",
  "dest": "destination",
  "dir": "directory"
}
```

## INCONSISTENCY DETECTION
Track usage across codebase:
1. Count occurrences of each form (abbreviated vs full)
2. Flag when both forms appear (ratio between 0.2-0.8 = mixed usage)

Example:
```
Found in codebase:
  "button": 45 occurrences
  "btn": 23 occurrences

  → INCONSISTENT: 34% abbreviated, 66% full
  → Recommend: standardize on "button"
```

## AMBIGUOUS ABBREVIATIONS (High)
Some abbreviations have multiple meanings - always flag:
```
res → response? result? resource? resolution?
val → value? validation? valid?
mod → module? modifier? modulo?
ref → reference? referer? refresh?
lib → library? liberal?
dev → development? device? developer?
prod → production? product?
```

## DOMAIN-SPECIFIC EXEMPTIONS
Don't flag well-established abbreviations:
```javascript
DOMAIN_EXEMPTIONS = {
  math: ["x", "y", "z", "dx", "dy", "sin", "cos"],
  networking: ["ip", "tcp", "udp", "http", "url", "dns"],
  database: ["id", "pk", "fk", "sql", "db"],
  react: ["props", "ref", "ctx"],
  express: ["req", "res", "next"],
  graphics: ["px", "rgb", "rgba", "hsl"]
}
```

Report each finding with:
- file:line reference
- The inconsistent abbreviation
- Both forms found in codebase
- Count of each form
- Suggested standardization
```

---

## Phase 3: Prioritize Findings

| Priority | Issue | Rationale |
|----------|-------|-----------|
| **P1 Critical** | Single-letter in public API | Unusable API |
| **P1 Critical** | Negative boolean in conditionals | Logic errors |
| **P2 High** | Vague names in public APIs | Documentation debt |
| **P2 High** | Missing boolean prefix | Readability |
| **P2 High** | Ambiguous abbreviations | Multiple meanings |
| **P3 Medium** | Abbreviation inconsistency | Maintenance burden |
| **P3 Medium** | Casing inconsistency within file | Style debt |
| **P4 Low** | Vague names in small local scopes | Minor readability |

## Phase 4: Present Findings

```markdown
## Names Audit Results

### Summary
- X vague generic names
- X single-letter variables (outside idioms)
- X boolean naming issues
- X casing inconsistencies
- X abbreviation inconsistencies

### P1 Critical
| Issue | Location | Current | Suggested |
|-------|----------|---------|-----------|
| ... | file:line | ... | ... |

### P2 High
...
```

## Phase 5: Fix Options

1. **Auto-fixable**:
   - Add boolean prefixes: `loading` → `isLoading`
   - Fix casing: `user_name` → `userName`
   - Standardize abbreviations (with confirmation)

2. **Semi-auto** (generate renames):
   - Rename vague variables with context-aware suggestions
   - Convert negative booleans to positive form

3. **Manual review required**:
   - Public API renames (breaking changes)
   - Domain-specific terminology decisions

## Recommended Fixes Reference

| Issue | Fix |
|-------|-----|
| `data` | `userData`, `configData`, `responseData` |
| `info` | `userInfo`, `metaInfo`, `displayInfo` |
| `handler` | `formSubmitHandler`, `errorHandler` |
| `loading` | `isLoading` |
| `isNotDisabled` | `isEnabled` |
| `hasNoErrors` | `isValid` or `!hasErrors` |

## Notes

- Some vagueness is acceptable in very small scopes
- Domain experts may have valid abbreviation preferences
- Renaming public APIs requires deprecation cycle
- Run formatter/linter after bulk renames
