# agent-html Current State

Blueprint is the architecture authority. This file is the compact snapshot of
the current stable rendering chain and the acceptance bar for the completed
pass.

```txt
semantic component contract
  + document style config reference
  -> agent writes semantic .agent.html
  -> parse / validate / sanitize
  -> SanitizedAgentHtml + approved visual config
  -> semantic-to-runtime mapping
  -> shadcn/native render
  -> portable HTML artifact
```

## Stable Decisions

- Public authoring stays semantic-first; document-level visual choice belongs to
  a separate configuration layer. The public visual config entry is a document
  style reference, not a per-component styling surface.
- Legacy `<ui>` / `<slot>` input and old non-profile render-config input stay
  out of the normal path.
- Current compatibility may keep named `profile` entries, but the target visual
  config surface is an approved document style config reference; `profile` is a
  compatibility alias for that reference.
- Schema and prompt expose only renderable semantic components and approved
  document-level visual config entries.
- Internal `theme` / `density` / `tone` / `width` remain resolved configuration
  tokens, not public config vocabulary.
- ahtml uses its own managed runtime; shadcn template / init / registry remain
  the source of truth for the runtime UI surface.
- Runtime verification data, generated introspection, renderer mapping, and
  slot metadata stay internal verification inputs, not the external product
  protocol.
- Internal component-level visual mapping can change appearance mapping only; it
  does not create a public per-component config surface and does not change
  semantic structure, renderer kind, or fallback policy.

## Acceptance Bar

- Final HTML contains real semantic or shadcn/native structure;
  `data-agent-html-component` markers alone are not enough.
- `ahtml schema --format prompt` exposes only renderable semantic components
  and approved document-level visual config entries.
- `ahtml build` produces representative artifact structure for the current
  supported semantic surface, including tabs, accordion, list, table, field
  controls, and option-set controls.
- Tabs and accordion remain interactive with JS and readable without JS.
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

## Current Pass

- The current artifact-focused pass is complete.
- Current shipped implementation still uses named `profile` as the compatibility
  visual entry.
- No component-level public style knobs are part of the current contract.
- Reopen `spec/` when product semantics expand beyond the current lane, or when
  document style config is promoted from target architecture to executable
  contract.

## Open Debt

- No active debt is currently tracked for the completed artifact-focused pass.
