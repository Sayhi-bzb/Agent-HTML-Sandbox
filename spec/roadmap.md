# agent-html Roadmap

The current pass is complete. This file is now future-facing only.

```txt
semantic component contract
  + document style config reference
  -> sanitized semantic document + approved visual config
  -> renderer mapping
  -> shadcn/native artifact
```

## Stable Direction

- Keep the public contract semantic-first and configuration-isolated.
- Keep document style config separate from agent-facing semantic nodes.
- Keep the configuration layer split into a global style layer and a component
  style layer.
- Keep the global style layer aligned to shadcn official theming token
  convention.
- Keep `tweakcn` as an engineering reference for global theme modeling and
  generation, not as a separate token canon.
- Keep document style config as the current public visual config layer; do not
  promote component-level visual knobs or raw global theme tokens into schema
  or prompt vocabulary.
- Keep shadcn details inside the managed runtime.
- Keep renderer evolution archetype-first rather than component-specific.
- Keep raw shadcn props, visual free-form config, and runtime-first authoring
  out of the public surface.

## Current State

- Phases 1 through 7 of the current artifact-focused pass are complete.
- The grouped adoption lane for `combobox`, `switch`, and `slider` is closed.
- Current implementation exposes approved document style config references
  through `style-ref` as the current main visual configuration entry.
- Overlay, menu, navigation, and app-shell semantics remain outside the current
  product lane.

## Reopen Conditions

Reopen roadmap work only if one of these changes:

- The product adds new content semantics beyond the current artifact-focused
  surface.
- The product changes the public configuration entry model beyond current
  `style-ref` usage.
- The product changes the global style layer token convention or its relation to
  shadcn official theming.
- The product needs a public component style layer contract instead of the
  current internal mapping model.
- The product needs controlled overlay, menu, navigation, or app-shell
  semantics.
- The public contract needs new data, action, media, or round-trip semantics
  that cannot be expressed through the current shared archetypes.

## Reopen Candidates

- If local fixture or registry snapshots become costly to maintain across
  shadcn upgrades, reopen fixture and registry maintenance work.
- If public visual syntax needs to change again, start a new execution spec
  rather than reintroducing compatibility aliases into the active contract.
