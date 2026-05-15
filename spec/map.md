# agent-html Rendering Chain Map

Blueprint is the architecture authority. This file only tracks the live
rendering chain, the remaining implementation gaps, and the fixed acceptance
bar for the current pass.

```txt
semantic component contract
  + presentation profile registry
  -> agent writes semantic .agent.html
  -> parse / validate / sanitize
  -> SanitizedAgentHtml + approved profile
  -> semantic-to-runtime mapping
  -> shadcn/native render
  -> portable HTML artifact
```

Current execution posture: keep the public contract semantic and profile-first,
keep shadcn inside the managed runtime, and expand breadth through shared
renderer archetypes instead of one-off component additions. Component grouping
and sequencing live in `spec/components-adoption.md`.

## Locked Decisions

### Public authoring

- The public authoring surface is semantic agent-html with named presentation
  profiles.
- Legacy `<ui>` / `<slot>` input and old non-profile render-config input do
  not return as normal public authoring paths.

### Presentation profiles

- Public visual choice is a profile id such as `ops-compact` or
  `review-dense`.
- Internal `theme` / `density` / `tone` / `width` remain runtime-resolved
  profile tokens, not public config vocabulary.

### Honest schema

- Schema and prompt expose only renderable semantic components and approved
  profiles.
- Unsupported or planned runtime data may exist internally, but not as normal
  agent-facing choices.

### Runtime boundary

- ahtml uses its own managed runtime and does not own a parallel UI kit.
- shadcn template / init / registry remain the source of truth for the runtime
  UI surface.

### Internal verification

- `render-capabilities`, generated introspection, renderer mapping, and slot
  metadata are internal verification inputs.
- They exist for contract/runtime/renderer parity and drift checks, not as the
  external product protocol.

### Acceptance bar

- Final HTML must contain real semantic or shadcn/native structure.
  `data-agent-html-component` markers alone are not enough.

## Current Main Gaps

- None for the current pass. Future work should reopen spec only when product
  semantics expand beyond the current artifact-focused lane.

## Fixed-State Criteria

- `ahtml schema --format prompt` exposes only renderable semantic components and
  approved presentation profiles.
- Public authoring stays semantic and profile-first; `<ui>` / `<slot>` and old
  flat render-config input stay out of the normal path.
- `ahtml build` produces real semantics for representative artifacts, including
  tabs, accordion, list, table, and current supported field or option-set
  structures.
- Tabs and accordion keep interaction when JS is available and remain readable
  when JS is unavailable.
- Runtime setup creates or repairs a shadcn-native managed runtime instead of
  relying on package-local UI copies or handwritten base CSS.
- Runtime setup, doctor surface, and fixture expectations use shared fact
  sources for setup components, required exports, and CSS base expectations.
- `doctor` fails on incomplete runtime surface, missing required shadcn
  components or exports, or contract/runtime/renderer parity drift.
- Runtime manifest keeps installed shadcn components separate from rendered
  agent-html components.
- Tests prevent public contract expansion from shipping without renderer or
  runtime support.
