---
context: fork
---

# Abstractions Audit

Detect premature, hollow, and over-engineered abstractions that add complexity without value.

## The Core Problem

Abstractions that add indirection without value increase cognitive load and maintenance burden. As Sandi Metz observed: "Duplication is far cheaper than the wrong abstraction."

## What This Command Detects

| Pattern | Description |
|---------|-------------|
| **Pass-through Functions** | Wrappers that merely forward calls without adding value |
| **Single-method Classes** | Classes that should be plain functions |
| **Single-implementation Interfaces** | Speculative generality - interfaces with only one implementation |
| **Middle Man** | Classes that delegate most work elsewhere |
| **Prop/Config Drilling** | Unchanged parameters passed through many layers |
| **God Utils** | Catch-all classes with unrelated static methods |

## Phase 1: Discover the Codebase

1. **Identify the tech stack**:
   - Language (TypeScript, Python, Java, Go, PHP, etc.)
   - Framework patterns (dependency injection, decorators, etc.)
   - Test framework (for understanding test seams)

2. **Identify architectural patterns**:
   - Adapters, facades, anti-corruption layers (legitimate thin wrappers)
   - API boundaries and extension points
   - Framework requirements (decorators, annotations)

## Phase 2: Parallel Audit (Using Subagents)

**Launch these subagents in parallel** using `Task` with `subagent_type=Explore`:

---

### Subagent 1: Pass-through & Hollow Wrappers

```
Audit this codebase for pass-through functions and hollow wrappers.

Tech stack: [from Phase 1]

## PASS-THROUGH FUNCTION DETECTION
A function is hollow if:
- Body has exactly 1 statement
- That statement is a call expression
- 80%+ of parameters are forwarded unchanged
- Cyclomatic complexity is 1 (no branching)

Search for functions that:
- Simply call another function with same/similar args
- Return the result of another function directly
- Add no validation, transformation, or logging

Examples of HOLLOW (flag these):
```typescript
// Just forwards to another function
function getUser(id: string) {
  return userService.getUser(id);
}

// Wrapper that adds nothing
async function fetchData(url: string) {
  return await api.fetch(url);
}
```

Examples of LEGITIMATE (don't flag):
```typescript
// Adds logging - legitimate
function getUser(id: string) {
  logger.info('Fetching user', { id });
  return userService.getUser(id);
}

// Adds error translation - legitimate
function fetchData(url: string) {
  try {
    return await api.fetch(url);
  } catch (e) {
    throw new AppError('Fetch failed', e);
  }
}
```

## FALSE POSITIVE SUPPRESSION
Don't flag if:
- File is in /adapters/, /facades/, /anti-corruption/
- Has @VisibleForTesting, @Api, @Deprecated annotations
- Contains logging, metrics, or tracing calls
- Is an API boundary or test seam
- Has comments: "API boundary", "testing seam", "extension point"

Report each finding with:
- file:line reference
- The hollow function
- What it wraps
- Suggested fix: inline or justify
```

---

### Subagent 2: Single-method Classes

```
Audit this codebase for single-method classes that should be plain functions.

Tech stack: [from Phase 1]

## SINGLE-METHOD CLASS DETECTION
Flag classes where:
- Exactly 1 public method (excluding constructor, getters, setters)
- Class name is a verb (CreateUser, SendEmail, ProcessOrder)
- Method name duplicates or mirrors class name
- No meaningful state beyond constructor injection

Examples of PROBLEMATIC:
```typescript
// Should be a function
class UserCreator {
  constructor(private db: Database) {}

  create(data: UserData): User {
    return this.db.insert('users', data);
  }
}

// Called as: new UserCreator(db).create(data)
// Should be: createUser(db, data)
```

```python
# Should be a function
class EmailSender:
    def __init__(self, smtp_client):
        self.smtp = smtp_client

    def send(self, email):
        return self.smtp.send(email)
```

## LEGITIMATE SINGLE-METHOD CLASSES
Don't flag if:
- Implements an interface/protocol (strategy pattern)
- Has @Injectable, @Service, @Component decorators (DI requirement)
- Is a Command/Query handler (CQRS pattern)
- Maintains state that changes over calls
- Is explicitly a Factory or Builder

Search for:
- Classes with verb names: *Creator, *Sender, *Processor, *Handler, *Builder
- Classes where the only method is execute(), run(), handle(), invoke()
- Classes that could be replaced with a single function

Report each finding with:
- file:line reference
- The class and its single method
- Whether it has meaningful state
- Suggested fix: convert to function or justify pattern
```

---

### Subagent 3: Single-implementation Interfaces

```
Audit this codebase for interfaces with only one implementation.

Tech stack: [from Phase 1]

## SINGLE-IMPLEMENTATION INTERFACE DETECTION
Find interfaces/abstract classes where:
- Only 1 concrete implementation exists in codebase
- Not at an API boundary (public package interface)
- Not a test seam (no mock implementations)
- Not a framework requirement

Search strategy:
1. Find all interface/protocol/abstract class definitions
2. For each, search for implementations:
   - TypeScript: `implements InterfaceName`
   - Java: `implements InterfaceName`
   - Python: subclasses or Protocol implementations
   - Go: types that satisfy the interface
3. Count implementations
4. Flag when count == 1 AND not in exempted categories

Examples of PREMATURE ABSTRACTION:
```typescript
// Interface with single implementation
interface UserRepository {
  findById(id: string): User;
}

class PostgresUserRepository implements UserRepository {
  findById(id: string): User { ... }
}

// If PostgresUserRepository is the ONLY implementation,
// the interface is speculative generality
```

## LEGITIMATE SINGLE IMPLEMENTATIONS
Don't flag if:
- Has a mock/stub/fake in test directories
- Is in /ports/, /interfaces/, /contracts/ (explicit boundary)
- Has @public, @api, or similar documentation
- Is a plugin/extension point interface
- Part of hexagonal/clean architecture boundary

Report each finding with:
- file:line reference
- The interface
- Its single implementation
- Whether a test double exists
- Suggested fix: collapse to concrete class or justify boundary
```

---

### Subagent 4: Middle Man & Excessive Delegation

```
Audit this codebase for Middle Man pattern and excessive delegation.

Tech stack: [from Phase 1]

## MIDDLE MAN DETECTION
A class is a Middle Man if:
- delegationRatio = delegatingMethods / totalMethods >= 0.5
- Most methods just call another object's method
- Class adds no state, validation, or transformation

Search for classes where:
- >50% of methods are one-liners delegating to injected dependency
- Class name suggests coordination but does no coordination
- Could be replaced by exposing the delegate directly

Example of MIDDLE MAN:
```typescript
class OrderService {
  constructor(private orderRepo: OrderRepository) {}

  findById(id: string) { return this.orderRepo.findById(id); }
  save(order: Order) { return this.orderRepo.save(order); }
  delete(id: string) { return this.orderRepo.delete(id); }
  findAll() { return this.orderRepo.findAll(); }
  // Every method just delegates - this class adds nothing
}
```

## PROP/CONFIG DRILLING
Track parameters passed through 3+ layers unchanged:

```typescript
// Layer 1
function handleRequest(config: Config) {
  processData(config);  // config untouched
}

// Layer 2
function processData(config: Config) {
  saveResult(config);   // config still untouched
}

// Layer 3
function saveResult(config: Config) {
  // Finally uses config.dbUrl
}
```

Search for:
- Parameters named: config, options, props, context, settings
- Same parameter signature repeated across call chain
- Parameters passed but not accessed until deep in call stack

Suggested fix: Use context pattern, dependency injection, or module-level config

Report each finding with:
- file:line reference
- The middle man class or drilling chain
- Delegation ratio or drilling depth
- Suggested fix
```

---

### Subagent 5: God Utils & Manager Classes

```
Audit this codebase for catch-all utility classes and manager anti-patterns.

Tech stack: [from Phase 1]

## GOD UTILS DETECTION
Flag classes/modules matching these patterns:

Name patterns (case-insensitive):
```regex
/(Manager|Handler|Helper|Utils?|Service|Processor|Coordinator|Common|Misc|Shared)$/
```

Combined with:
- >10 static methods
- Low cohesion (methods don't share data/dependencies)
- Methods with diverse, unrelated responsibilities

Example of GOD UTILS:
```typescript
// Catch-all with unrelated methods
class Utils {
  static formatDate(d: Date): string { ... }
  static validateEmail(e: string): boolean { ... }
  static calculateTax(amount: number): number { ... }
  static parseConfig(json: string): Config { ... }
  static generateId(): string { ... }
  static sanitizeHtml(html: string): string { ... }
  // 20 more unrelated methods...
}
```

## COHESION ANALYSIS
For each Utils/Helper class:
1. Group methods by what they operate on
2. If 3+ distinct groups exist, class should be split
3. Suggest domain-based extraction

Suggested splits:
```
Utils → DateUtils, ValidationUtils, TaxCalculator, ConfigParser, IdGenerator, HtmlSanitizer
```

## MANAGER/HANDLER SMELL
Flag classes named *Manager or *Handler that:
- Have >10 methods
- Mix different concerns (data access + business logic + formatting)
- Have constructor with >5 dependencies

Report each finding with:
- file:line reference
- The class and method count
- Identified responsibility groups
- Suggested extractions
```

---

## Phase 3: Prioritize Findings

| Priority | Pattern | Rationale |
|----------|---------|-----------|
| **P1 Critical** | Pass-through forwarding ALL params | Zero added value |
| **P1 Critical** | Single-method class with verb name | Should be plain function |
| **P2 High** | Interface with one implementation (no test double) | Premature abstraction |
| **P2 High** | Middle Man (>75% delegation) | Remove indirection |
| **P2 High** | Prop drilling >5 layers | Consider context pattern |
| **P3 Medium** | Utils with >20 unrelated methods | Cohesion problem |
| **P3 Medium** | Manager class mixing concerns | Extract by responsibility |

## Phase 4: Present Findings

```markdown
## Abstractions Audit Results

### Summary
- X pass-through functions found
- X single-method classes
- X single-implementation interfaces
- X middle man classes
- X god utils/managers

### P1 Critical - Inline or Convert
| Issue | Location | Pattern | Fix |
|-------|----------|---------|-----|
| ... | file:line | ... | ... |

### P2 High - Simplify
...

### P3 Medium - Refactor When Touched
...
```

## Phase 5: Fix Options

1. **Auto-fixable**:
   - Inline pass-through functions (if no external callers)
   - Collapse single-impl interface to concrete class

2. **Semi-auto** (generate refactor):
   - Convert single-method class to function
   - Split god utils by domain

3. **Manual review required**:
   - Middle man removal (need to update all callers)
   - Prop drilling → context pattern (architectural decision)

## Recommended Fixes Reference

| Pattern | Fix Strategy |
|---------|--------------|
| Pass-through function | Inline Method - call target directly |
| Single-method class | Inline Class - merge into caller or convert to function |
| Single-impl interface | Collapse Hierarchy - use concrete class |
| Middle Man | Remove Middle Man - expose delegate directly |
| Prop drilling | Introduce Context/Container pattern |
| Utils dumping ground | Extract Class by domain |

## Notes

- Some abstractions exist for future extensibility - ask before removing
- Test seams are legitimate single-implementation interfaces
- Framework requirements (DI decorators) justify some patterns
- Check git history - recent abstractions may be WIP
