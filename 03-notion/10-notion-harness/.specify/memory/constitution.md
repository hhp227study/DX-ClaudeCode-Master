<!--
Sync Impact Report
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Bump rationale: MAJOR — first concrete constitution for this project; all
  placeholder principles replaced with binding rules (not an amendment to a
  prior ratified version).

Modified principles: N/A (initial adoption, no prior titled principles)
Added sections:
  - I. Test-First Development (NON-NEGOTIABLE)
  - II. Real-Behavior Verification (No Mock Theater)
  - III. Simplicity & YAGNI
  - IV. Free-Tier, Zero-Cost Operation
  - V. Spec-Driven Workflow
  - Technology Stack Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: none

Templates requiring updates:
  - .specify/templates/tasks-template.md — ✅ updated (tests are no longer
    optional; "Tests for User Story N" sections and their MUST-write-first
    note are now mandatory, not gated behind "if explicitly requested")
  - .specify/templates/plan-template.md — ✅ no edit needed; "Constitution
    Check" and "Testing" fields already read dynamically from this file
  - .specify/templates/spec-template.md — ✅ no edit needed; "User Scenarios
    & Testing" section already mandatory and framework-agnostic
  - .claude/skills/speckit-*/SKILL.md (command files) — ✅ no edit needed;
    already agent-generic, no CLAUDE-only references found

Follow-up TODOs: none
-->

# Mini Notion (10-notion-harness) Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

Every unit of production code — every new feature, bug fix, refactor, or
behavior change — MUST follow the `superpowers:test-driven-development` Red-Green-Refactor
cycle: write one failing test, watch it fail for the right reason, write the
minimal code to pass, watch it pass, then refactor with tests green.

Rules that follow directly from this:

- **The Iron Law**: no production code is written without a failing test that
  demands it. Code written before its test is deleted and rebuilt from tests,
  not "adapted."
- **Both RED and GREEN must be observed**, not assumed. A test that was never
  watched failing proves nothing. Run `npm test` (or `npm run test:watch` for
  a single file) after writing the test and again after implementing.
- **Tests are not optional deliverables.** A task is not "done" until its
  test exists, was watched failing, and now passes. `tasks.md` MUST NOT mark
  test-writing as skippable for this project — see Technology Stack
  Constraints for the concrete tooling.
- Exceptions (throwaway prototypes, generated code, static configuration
  files) require explicit sign-off from the project owner (hhp227) before
  the exception is taken, per `superpowers:test-driven-development`.

**Rationale**: This is a solo-maintained, free-tier personal product with no
QA staff and no safety net. TDD is the only mechanism that catches
regressions before they reach the single developer who is also the only
tester.

### II. Real-Behavior Verification (No Mock Theater)

Tests MUST verify real behavior, not mock behavior, following
`superpowers:test-driven-development`'s testing anti-patterns:

- Never assert against a mock's existence or a mock's return value as if it
  were the thing under test.
- Never add test-only methods (e.g. `destroy()`, `_reset()`) to production
  classes; put test cleanup in test utilities instead.
- Never mock a dependency without first understanding what side effects the
  test actually relies on; mock at the lowest boundary that preserves real
  behavior (e.g. the network call, not the service class that owns it).
- Any mock MUST mirror the complete real data shape it stands in for —
  partial mocks that omit fields the code consumes downstream are forbidden.
- Prefer no mock at all (real DB/JSDOM/React Testing Library render) over a
  complex mock; if mock setup exceeds the test's own logic in size, that is
  a signal to use a real dependency instead.

**Rationale**: A green suite that only proves mocks work is worse than no
suite — it hides the exact regressions TDD exists to catch.

### III. Simplicity & YAGNI

Build only what the current user story requires. No speculative
abstractions, no configuration options without a caller, no premature
multi-tenancy or plugin systems.

- This is a single-user product (see PRD §5 제약 조건: 1인 개발, 개인용,
  다중 사용자 협업은 목표가 아님). Do not design for teams, roles, or
  permissions unless a spec explicitly requires it.
- Three similar lines beat a premature abstraction. Extract a helper only
  when a third real caller appears.
- Every dependency added to `package.json` must justify its cost against the
  free-tier constraint in Principle IV.

**Rationale**: Solo development on a free-tier budget cannot absorb the
maintenance cost of speculative generality.

### IV. Free-Tier, Zero-Cost Operation

All infrastructure, libraries, and services MUST run within free-tier limits
of their providers. No paid subscriptions, no paid API tiers, no
infrastructure that requires a credit card to stay running.

- Authentication is Google OAuth only (per PRD) — no separate password
  storage, no paid auth provider.
- Any new external service proposed in a spec or plan MUST document its
  free-tier ceiling and what happens when the project exceeds it.

**Rationale**: The PRD's stated objective is cost elimination versus
commercial tools (PRD §4, §6); infrastructure choices that reintroduce cost
defeat the product's reason for existing.

### V. Spec-Driven Workflow

Feature work MUST flow through the spec-kit pipeline in order:
`/speckit-specify` → (`/speckit-clarify` optional) → `/speckit-plan` →
`/speckit-tasks` → `/speckit-implement`. Implementation MUST NOT begin before
a `tasks.md` exists for the feature, and every task touching production code
is subject to Principle I.

**Rationale**: A solo developer working across many sessions needs the spec
artifacts as the persistent source of truth that survives context loss
between sessions.

## Technology Stack Constraints

- **Runtime/Framework**: Next.js 15 (App Router) + React 19, JavaScript
  (no TypeScript build step), matching the sibling `mini-notion` prototypes
  in this repository.
- **Testing**: Vitest 3 (`environment: jsdom`) + `@testing-library/react` +
  `@testing-library/jest-dom`, configured in `vitest.config.js` /
  `vitest.setup.js` at the project root. This is the required stack for
  Principle I — do not introduce a second, competing test runner.
  - Run all tests: `npm test` (== `vitest run`)
  - Watch mode while developing a single test: `npm run test:watch`
  - Unit tests live under `tests/unit/`; component/integration tests under
    `tests/integration/` (create the directory when the first such test is
    written).
- **Path alias**: `@/*` resolves to the project root (see `jsconfig.json`
  and the `resolve.alias` entry in `vitest.config.js` — both must be kept in
  sync if the alias changes).
- **Storage/Auth**: chosen per-feature in `plan.md`, constrained by
  Principle IV (free tier only).

## Development Workflow & Quality Gates

- No task in `tasks.md` may be checked off unless: its test was written
  first, watched failing, and now passes (Principle I), and `npm test` is
  green with no stray console errors/warnings.
- `/speckit-plan`'s Constitution Check gate MUST verify the feature's planned
  test approach matches the Technology Stack Constraints above before Phase 0
  research begins, and again after Phase 1 design.
- Any deviation from a Core Principle MUST be recorded in the plan's
  Complexity Tracking table with a concrete justification — silent
  deviation is a constitution violation.

## Governance

This constitution supersedes ad-hoc practice for this project. Amendments
are made by editing this file directly (solo project — no separate approval
body), and MUST:

1. State the version bump (MAJOR/MINOR/PATCH) and rationale using semantic
   versioning: MAJOR for removing/redefining a principle, MINOR for adding a
   principle or materially expanding guidance, PATCH for wording/typo fixes.
2. Update the Sync Impact Report at the top of this file.
3. Propagate any changed testing/tooling requirement into
   `.specify/templates/*.md` in the same change.

Every `/speckit-plan` run MUST re-check its Constitution Check gate against
the current version of this file. Complexity that violates a principle
requires justification in the plan, not silent omission.

**Version**: 1.0.0 | **Ratified**: 2026-07-09 | **Last Amended**: 2026-07-09
