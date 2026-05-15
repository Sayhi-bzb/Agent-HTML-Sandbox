# agent-html Current State

Blueprint is the architecture authority. This file is the compact snapshot of
the current stable rendering chain and the acceptance bar for the completed
pass.

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

## Stable Decisions

- Public authoring stays semantic and profile-first.
- Legacy `<ui>` / `<slot>` input and old non-profile render-config input stay
  out of the normal path.
- Schema and prompt expose only renderable semantic components and approved
  profiles.
- Internal `theme` / `density` / `tone` / `width` remain runtime-resolved
  profile tokens, not public config vocabulary.
- ahtml uses its own managed runtime; shadcn template / init / registry remain
  the source of truth for the runtime UI surface.
- Runtime verification data, generated introspection, renderer mapping, and
  slot metadata stay internal verification inputs, not the external product
  protocol.

## Acceptance Bar

- Final HTML contains real semantic or shadcn/native structure;
  `data-agent-html-component` markers alone are not enough.
- `ahtml schema --format prompt` exposes only renderable semantic components
  and approved presentation profiles.
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
- Reopen `spec/` only when product semantics expand beyond the current lane.

## Open Debt

- `combobox` is supported, but its current `Input + datalist` path is not the
  official shadcn combobox implementation route.
- Checked-in renderer/template snapshots can drift from the generated runtime
  support surface.
- Field/control rendering still relies on custom wrapper and fallback
  composition that is not fully aligned with official shadcn composition
  guidance.
- Local shadcn fixture snapshots and test registry responses can drift from
  upstream registry and docs behavior.
