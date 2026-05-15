# agent-html Roadmap

This roadmap tracks the remaining implementation path after public contract
convergence. The repo stays a private workspace: `@agent-html/core` and
`@agent-html/ahtml` remain the publishable packages, while product apps
integrate through the CLI boundary.

```txt
semantic component contract
  + presentation profile registry
  -> sanitized semantic document
  -> renderer mapping
  -> shadcn/native artifact
```

## Current Execution Rhythm

The main line is no longer "add more public parameters" or "install more
components." The main line is:

1. Keep the public contract stable as semantic components plus named
   presentation profiles.
2. Keep shadcn details inside the managed runtime.
3. Finish shared renderer archetypes and resolvers before widening component
   coverage.

### Parameter Priorities

- Prefer semantic content fields such as `title`, `label`, `description`,
  `value`, and `text`.
- Prefer semantic state fields such as `tone`, `kind`, `default`, `required`,
  `disabled`, and `invalid`.
- Prefer controlled structure nodes such as `item`, `row`, `cell`, `tab`,
  `accordion-item`, and future `option` nodes.
- Do not reopen public `variant`, `size`, `surface`, `radius`, `spacing`,
  `className`, or raw shadcn prop surfaces.

### Component Expansion Order

- The current grouped-adoption lane is closed after `combobox`, `switch`, and
  `slider`.
- Overlay, menu, navigation, and app-shell semantics remain out of the
  near-term lane.

Detailed grouping and status live in `spec/components-adoption.md`. Execution
checklists live in `spec/phase-checklist.md`.

## Closed Preconditions

### Phase 1: Lock The Public Contract

Status: closed.

Public authoring stays semantic and profile-first. Legacy `<ui>` / `<slot>`
input and old non-profile render-config input stay rejected unless a future
spec explicitly reopens them.

### Phase 2: Move Visual Choice Under Presentation Profiles

Status: closed.

Public docs, schema, help text, inspection output, and debug language keep
profile-first wording on the public surface. Internal resolved tokens remain
runtime-only data, not public authoring config.

## Active Roadmap

### Phase 3: Keep Shadcn Internal And Runtime-Native

Status: closed.

Goal:
managed runtime source of truth collapses to shadcn template / init /
registry; ahtml only injects renderer, sanitized document, verification data,
and build or doctor glue.

Current gap:
closed by keeping runtime setup, doctor surface, and fixture expectations on
the same shadcn-native fact sources.

Done when:
runtime bootstrap, doctor surface, and fixture expectations all treat
shadcn-native runtime creation or repair as the only UI base.

### Phase 4: Convert Capability Extraction Into Verification Only

Status: closed.

Goal:
`render-capabilities`, generated introspection, renderer mapping, and slot
metadata exist only as internal verification infrastructure.

Current gap:
closed by keeping implementation, diagnostics, spec, and blueprint language on
verification-first terminology for runtime verification data and drift checks.

Done when:
spec, diagnostics, and implementation naming all use verification-first
language, and public schema changes cannot bypass parity checks.

### Phase 5: Finish Semantic-To-Runtime Mapping

Status: closed.

Goal:
the renderer main path becomes semantic node -> shared resolver or archetype ->
shadcn/native/composite UI.

Current gap:
closed by keeping field/control, option-set, tabs, accordion, table, and
collection rendering on shared semantic-to-runtime machinery instead of
component-specific adapters.

Done when:
component mapping is described and implemented as shared semantic-to-runtime
machinery rather than ad hoc adapters.

### Phase 6: Prove The Contract End To End

Status: closed.

Goal:
build, preview, inspect, doctor, and tests jointly prove the chain from public
contract to artifact.

Current gap:
closed by keeping representative artifacts, inspection output, doctor checks,
preview, runtime drift checks, and artifact assertions on the same
contract/profile/runtime parity model.

Done when:
representative artifacts, inspection output, doctor, and drift tests all speak
the same contract/profile/runtime parity model.

### Phase 7: Expand Without Reintroducing The Old Design

Status: closed.

Goal:
new components enter only through semantic contracts, profile compatibility,
runtime verification, doctor checks, and targeted artifact tests.

Current gap:
closed by landing `combobox`, `switch`, and `slider` on the shared
archetype-first path without reopening raw shadcn props or runtime-first
authoring.

Done when:
`combobox`, `switch`, and `slider` are supported without reopening raw shadcn
props or a runtime-first authoring surface.
