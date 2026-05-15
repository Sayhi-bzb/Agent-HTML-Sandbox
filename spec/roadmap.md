# agent-html Roadmap

The current pass is complete. This file is now future-facing only.

```txt
semantic component contract
  + presentation profile registry
  -> sanitized semantic document
  -> renderer mapping
  -> shadcn/native artifact
```

## Stable Direction

- Keep the public contract semantic and profile-first.
- Keep shadcn details inside the managed runtime.
- Keep renderer evolution archetype-first rather than component-specific.
- Keep raw shadcn props, visual free-form config, and runtime-first authoring
  out of the public surface.

## Current State

- Phases 1 through 7 of the current artifact-focused pass are complete.
- The grouped adoption lane for `combobox`, `switch`, and `slider` is closed.
- Overlay, menu, navigation, and app-shell semantics remain outside the current
  product lane.

## Reopen Conditions

Reopen roadmap work only if one of these changes:

- The product adds new content semantics beyond the current artifact-focused
  surface.
- The product needs controlled overlay, menu, navigation, or app-shell
  semantics.
- The public contract needs new data, action, media, or round-trip semantics
  that cannot be expressed through the current shared archetypes.

## Reopen Candidates

- If `combobox` must align with the official shadcn combobox implementation and
  interaction model, reopen renderer/runtime work.
- If checked-in runtime template sources must stay synchronized with the actual
  generated runtime support surface, reopen renderer/runtime sync work.
- If field/control rendering should follow more official shadcn composition
  patterns instead of custom wrappers and fallback markup, reopen renderer
  composition work.
- If local fixture or registry snapshots become costly to maintain across
  shadcn upgrades, reopen fixture and registry maintenance work.
