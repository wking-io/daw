---
context: fork
---

# Full Codebase Audit

Run all audit skills in parallel and produce a unified report.

## Instructions

### Phase 1: Launch All Audits

Launch **all 7 audit subagents in parallel** using `Task` with `subagent_type=general-purpose`. Each subagent should invoke its corresponding skill via the `Skill` tool, then return its findings.

Launch these in a **single message** with 7 parallel `Task` calls:

1. **State Drift** — `Skill` tool with `skill: "audit-drift"`
2. **Dead Code** — `Skill` tool with `skill: "audit-dead-code"`
3. **Idiomatic Usage** — `Skill` tool with `skill: "audit-idiomatic"`
4. **Names** — `Skill` tool with `skill: "audit-names"`
5. **TODOs** — `Skill` tool with `skill: "audit-todos"`
6. **Abstractions** — `Skill` tool with `skill: "audit-abstractions"`
7. **Boundaries** — `Skill` tool with `skill: "audit-boundaries"`

Each subagent prompt should be:
```
Run the [audit-name] skill on this codebase and return the full report. Use the Skill tool to invoke it: skill: "audit-[name]"
```

### Phase 2: Unified Report

After all subagents complete, combine their findings into a single report:

```markdown
# Full Codebase Audit Report

## Executive Summary
- Total findings: X
- Critical: X | High: X | Medium: X | Low: X
- Top 3 areas of concern

## Findings by Audit

### State Drift
[Summary from audit-drift]

### Dead Code
[Summary from audit-dead-code]

### Idiomatic Usage
[Summary from audit-idiomatic]

### Names
[Summary from audit-names]

### TODOs
[Summary from audit-todos]

### Abstractions
[Summary from audit-abstractions]

### Boundaries
[Summary from audit-boundaries]

## Cross-cutting Themes
[Patterns that appeared across multiple audits]

## Recommended Action Plan
1. **Immediate** — Critical findings from any audit
2. **This sprint** — High-priority items
3. **Backlog** — Medium/low items worth tracking
```

### Phase 3: Fix Options

Present the user with options:
1. **Fix critical only** — Address P1 findings across all audits
2. **Fix by audit** — Pick specific audit categories to address
3. **Export report** — Save the full report to a file
4. **Report only** — No changes, just the findings
