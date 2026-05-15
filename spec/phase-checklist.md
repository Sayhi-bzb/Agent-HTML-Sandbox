# Phase Execution Checklist

This file turns `spec/roadmap.md` into an execution checklist. It does not
replace blueprint, and it does not restate `spec/map.md`.

Use it like this:

- Read `roadmap.md` for phase priority.
- Read `map.md` for fixed acceptance criteria and the current main gaps.
- Use this file for the next actions and proof points only.

## Guardrails To Keep Green

- README, docs, skill guidance, CLI help, and schema prompt keep using the
  semantic component contract plus presentation profile vocabulary.
- CLI schema keeps exposing `profile` as the only public render-config entry.
- Sanitize keeps rejecting legacy `<ui>` / `<slot>` input and old non-profile
  render-config input.

Proof:

- `packages/ahtml/src/cli/cli.test.ts`
- `packages/core/src/render-config.test.ts`
- `packages/core/src/parse/sanitize-agent-html.test.ts`

## Phase 2 Cleanup Tail

### Status

- Closed.

### Goal

- Remove the remaining public-facing language that still describes internal
  resolved tokens as user-facing config.

### Do Next

- Keep schema, prompt, help text, inspection output, and app-integration
  surfaces profile-first on the public contract.

### Proof

- `packages/core/src/render-config.ts`
- `packages/ahtml/src/cli/schema.mjs`
- `packages/ahtml/src/cli/artifact-workflow.mjs`
- `packages/ahtml/src/cli/cli.test.ts`

### Close When

- Public docs, schema, help text, and inspection output no longer describe
  internal tokens as part of the public authoring contract.

## Phase 3: Keep Shadcn Internal And Runtime-Native

### Status

- Closed.

### Goal

- Make the managed runtime source of truth converge on shadcn template / init /
  registry, with ahtml only keeping its renderer and glue layers.

### Do Next

- Keep runtime setup, doctor surface, and fixture expectations on the shared
  shadcn-native fact sources for setup components, required exports, and CSS
  base expectations.

### Proof

- `packages/ahtml/src/cli/runtime-template.mjs`
- `packages/ahtml/src/cli/runtime-surface.mjs`
- `packages/ahtml/src/cli/runtime-setup.mjs`
- `packages/ahtml/src/cli/doctor-checks.mjs`

### Close When

- Runtime setup, `doctor`, and heavy CLI verification no longer drift because
  of separate UI-base ownership.

## Phase 4: Convert Capability Extraction Into Verification Only

### Status

- Closed.

### Goal

- Treat capability extraction assets strictly as internal verification
  infrastructure.

### Do Next

- Keep implementation, diagnostics, spec, and blueprint language on
  verification-first terminology, and keep schema changes gated by renderer and
  runtime parity checks.

### Proof

- `packages/ahtml/src/config/render-capabilities.mjs`
- `packages/ahtml/src/cli/runtime-renderability.mjs`
- `packages/ahtml/src/cli/doctor-checks.mjs`
- `blueprint/tool-ref/component-schema-generation.md`

### Close When

- Spec, blueprint, and implementation naming all describe capability
  extraction as internal verification input rather than agent-facing schema
  source.

## Phase 5: Finish Semantic-To-Runtime Mapping

### Status

- Closed.

### Goal

- Make the renderer main path consistently semantic node -> shared resolver or
  archetype -> shadcn/native/composite UI.

### Do Next

- Keep future renderer work on the shared semantic-to-runtime path and avoid
  reintroducing component-specific adapters.

### Proof

- `packages/ahtml/src/cli/runtime-template/src/renderer/render-node.tsx`
- `packages/ahtml/src/config/component-capabilities.mjs`
- `packages/ahtml/src/config/render-capabilities.mjs`
- `packages/ahtml/src/cli/runtime-renderability.test.ts`

### Close When

- `map.md` no longer needs to call out one-off resolver logic as a main gap.

## Phase 6: Prove The Contract End To End

### Status

- Closed.

### Goal

- Make build, preview, inspect, doctor, and tests prove the same public
  contract-to-artifact chain.

### Do Next

- Keep build, preview, inspect, doctor, and drift assertions on the same
  contract/profile/runtime parity model as the default proof language.

### Proof

- `packages/ahtml/src/cli/cli.heavy.test.ts`
- `packages/ahtml/src/cli/runtime-surface.test.ts`
- `packages/ahtml/src/cli/runtime-template/src/renderer/render-node.test.ts`
- `packages/core/src/parse/sanitize-agent-html.test.ts`

### Close When

- Representative artifacts, inspection output, doctor, and drift tests all
  validate the same current contract.

## Phase 7: Expand Without Reintroducing The Old Design

### Status

- Closed.

### Goal

- Keep component expansion driven by archetype and adoption status instead of
  shadcn installation convenience.

### Do Next

- Keep future component expansion on the shared archetype-first path.
- Require schema, sanitize, renderer, runtime requirement, doctor, tests, and
  spec updates together for every new component.

### Proof

- `spec/components-adoption.md`
- `packages/core/src/component-schema.test.ts`
- `packages/core/src/parse/sanitize-agent-html.test.ts`
- `packages/ahtml/src/cli/runtime-template/src/renderer/render-node.test.ts`

### Close When

- `combobox`, `switch`, and `slider` are supported without reopening
  runtime-first authoring.

## Verification Rhythm

- Pure spec, docs, or skill text changes: inspect the final diff only.
- Runtime, doctor, build, or inspect changes: run the narrowest relevant tests
  before any broader gate.
- Fixture or registry drift: fix the fixture first, then rerun the blocked
  heavy CLI scenario.
