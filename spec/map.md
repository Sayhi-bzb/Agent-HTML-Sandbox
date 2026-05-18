# agent-html Current State

Blueprint is the architecture authority. This file is the compact current
specification for the active rendering chain and the refactor direction that
other `spec/` documents should follow.

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

## Current Architecture

- Public authoring stays semantic-first.
- The architecture is split into three layers:
  - configuration layer
  - usage layer
  - implementation layer
- The configuration layer is split into:
  - global style layer
  - component style layer
- The global style layer follows the shadcn official theming token convention:
  semantic color pairs, light/dark token sets, radius scale, and CSS variable
  mapping.
- The global style layer may reuse `tweakcn` as the engineering reference for
  theme modeling, preset structure, and generation logic.
- The component style layer owns controlled component treatment mapping and does
  not become agent-facing document syntax.
- The current public visual entry remains an approved complete style profile
  reference serialized through `style-ref`.
- Each `style-ref` points to one complete style profile that contains both
  global style configuration and component style configuration.
- Style profiles come from builtin profiles and user profiles, managed in
  separate directories.
- If a referenced `style-ref` cannot be resolved, the system falls back to the
  default style profile.
- Style profiles are complete artifacts and do not use inheritance or runtime
  merge behavior.
- Schema and prompt expose only renderable semantic components and approved
  document-level visual config entries.
- ahtml uses its own managed runtime; shadcn template / init / registry remain
  the source of truth for the runtime UI surface.
- Runtime verification data, generated introspection, renderer mapping, and
  slot metadata stay internal verification inputs, not the external product
  protocol.

## Refactor Guidance

- Treat `spec/map.md` as the main refactor guidance document for configuration,
  layering, and public surface decisions.
- Use `spec/style-system-execution.md` for the active style-system execution
  cadence, phase order, and acceptance proof path.
- Keep the public surface limited to semantic components plus controlled
  document-level visual entry.
- Treat `style-ref` as a style profile id, not as a token set or partial style
  patch.
- Keep global theme token rules aligned to shadcn official theming instead of
  creating a parallel token convention.
- Keep component treatment mapping inside configuration and renderer paths
  rather than exposing per-component styling knobs to agent-facing authoring.
- Keep managed runtime CSS, tokens, and component implementation sourced from
  shadcn-native runtime setup.

## Acceptance Bar

- Final HTML contains real semantic or shadcn/native structure;
  `data-agent-html-component` markers alone are not enough.
- `ahtml schema --format prompt` exposes only renderable semantic components
  and approved document-level visual config entries.
- `ahtml build` produces representative artifact structure for the supported
  semantic surface, including tabs, accordion, list, table, field controls,
  and option-set controls.
- Tabs and accordion remain interactive with JS and readable without JS.
- Runtime setup creates or repairs a shadcn-native managed runtime instead of
  relying on package-local UI copies or handwritten base CSS.
- `doctor` fails on incomplete runtime surface, missing required shadcn
  components or exports, or contract/runtime/renderer parity drift.

## Current Pass

- The current artifact-focused pass is complete.
- Active style-system migration planning now lives in
  `spec/style-system-execution.md`.
- `style-ref` remains the current public visual entry.
- No component-level public style knobs are part of the current contract.
