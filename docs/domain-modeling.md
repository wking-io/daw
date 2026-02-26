# Domain Modeling: Primitives First

## Principles

### 1. Primitives First

Before writing inline arithmetic or geometric logic, search `packages/core/src/lib/` for existing operations. The core library contains generic, typeclass-polymorphic primitives for common mathematical concepts:

- `Span` — interval operations (overlap, intersection, subtraction)
- `Numeric` — generic arithmetic typeclass
- `QN` — quarter-note branded numeric
- `Px` — pixel branded numeric

If the operation you need doesn't exist but is generic (not domain-specific), add it as a primitive with tests before using it in application code.

### 2. Recognize Known Math

Many patterns that appear in DAW code are well-known mathematical operations:

- **Interval algebra** — overlap detection, intersection, subtraction (`Span`)
- **Projection** — linear mapping between coordinate spaces
- **Clamping** — bounding values within ranges (`Numeric.clamp`)
- **Normalization** — mapping to [0, 1] range

These belong as generic library functions, not inline in application code.

### 3. Law-Driven Testing

New primitives should have testable algebraic laws alongside example-based tests. Laws provide stronger guarantees than individual examples because they express universal properties:

- **Symmetry**: `overlaps(a, b) === overlaps(b, a)`
- **Conservation**: `sum(subtract sizes) === a.size - intersection.size`
- **Commutativity**: `intersection(a, b) === intersection(b, a)`
- **Identity**: `subtract(a, disjoint) === [a]`
- **Annihilation**: `subtract(a, superset) === []`

### 4. Composition Over Reimplementation

Application code should compose primitives rather than re-derive geometric truths. If you find yourself writing a case analysis over interval positions, the logic likely belongs in a generic primitive.

## Worked Example: Span.subtract

### Before — inline case analysis in clip-overlap.ts

```ts
const startsBeforeMoved = QN.lt(clipStart, newStart);
const endsAfterMoved = QN.gt(clipEnd, movedEnd);

if (!startsBeforeMoved && !endsAfterMoved) {
  // Fully covered → delete
} else if (startsBeforeMoved && !endsAfterMoved) {
  // Left overlap → trim
} else if (!startsBeforeMoved && endsAfterMoved) {
  // Right overlap → move start
} else {
  // Straddle → split into two pieces
}
```

This manually re-implements interval subtraction — a well-known operation from Allen's interval algebra.

### After — composing Span primitives

```ts
const remainders = Span.subtract(QN.Numeric, clip.span, movedSpan);

if (remainders.length === 0) {
  // Fully covered → delete
} else if (remainders.length === 1) {
  // Partial overlap → resize to remainder
} else {
  // Straddle → resize + create new clip for second piece
}
```

The geometry is handled by tested, law-verified primitives. The application code only handles the domain-specific consequences (delete, resize, split).
