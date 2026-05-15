# Phase Checklist

The current pass is complete. Keep this file as the lightweight verification
and reopen guide instead of a phase-by-phase execution log.

## Current Pass

- `spec/map.md` is the compact current-state snapshot.
- `spec/roadmap.md` is future-facing only.
- `spec/components-adoption.md` is the stable support matrix for the completed
  grouped-adoption lane.
- If product semantics reopen, start a new checklist rather than restoring the
  closed phase logs here.

## Guardrails

- README, docs, skill guidance, CLI help, and schema prompt keep semantic
  component contract plus presentation profile vocabulary.
- CLI schema keeps exposing `profile` as the only public render-config entry.
- Sanitize keeps rejecting legacy `<ui>` / `<slot>` input and old non-profile
  render-config input.
- Future renderer work stays on the shared semantic-to-runtime path instead of
  reintroducing component-specific adapters.
- Future component expansion stays on the shared archetype-first path and
  updates schema, sanitize, renderer, runtime requirement, doctor, tests, and
  spec together.

## Verification Rhythm

- Pure spec, docs, or skill text changes: inspect the final diff only.
- Runtime, doctor, build, or inspect changes: run the narrowest relevant tests
  before any broader gate.
- Fixture or registry drift: fix the fixture first, then rerun the blocked
  heavy CLI scenario.
- If spec reopens, re-establish proof at the smallest useful layer first:
  schema, sanitize, renderer mapping, runtime surface, then heavy CLI flows.
