---
name: change-review
description: >-
  Performs a structured post-change review for bugs, error handling gaps, test
  coverage, security/product invariants, and consistency with FunversarialCV
  patterns. Use when the user asks for a code review, PR review, pre-merge
  check, audit of recent changes, or verification against project conventions;
  or after a large refactor or feature before opening a PR.
---

# Change review (structured)

## Scope

- Prefer **files changed in the current task** (or the diff the user provides). If only a subset is in context, say what you could not see.
- Align with root `.cursorrules` and existing tests/conventions in `frontend/` (or relevant package).

## Review checklist

### Correctness & edge cases

- Logic matches intent; boundary conditions (empty file, huge input, malformed data).
- Types are honest; no `any` unless justified; async/await used consistently.
- Client vs server boundaries respected (`'use client'` only where needed).

### Error handling & UX

- Failures surface appropriately (toast, error state, or structured API error).
- No silent `catch {}` without comment; logging strategy matches project.
- Loading and empty states where users wait on I/O.

### Tests (TDD alignment)

- Non-trivial behavior has or updates tests in the project’s stack; edge cases covered where risk is high.

### FunversarialCV invariants

- **Stateless / zero-retention:** No storing user uploads; in-memory processing only unless explicitly out of scope for the change.
- **Eggs / plugins:** `IEgg` shape and OWASP LLM Top 10 linkage in metadata/docs when eggs change.
- **Security comments:** Security-related logic blocks have clear comments per `.cursorrules`.

### Patterns & churn

- Matches neighboring code style (imports, components, lib layout).
- No unrelated refactors bundled with the task; diff stays focused.

## Output format

1. **Summary** — One short paragraph: merge readiness (ready / ready with nits / needs work).
2. **Findings** — Bullets with **severity** (`blocker` / `major` / `minor` / `nit`) and file path.
3. **Suggested tests** — Only if gaps are material.

If the user asked only for review, do not rewrite large sections of code unless they ask for fixes.
