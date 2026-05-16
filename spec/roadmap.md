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
- Keep document style config as the only public visual config layer; do not
  promote component-level visual knobs into schema or prompt vocabulary.
- Keep shadcn details inside the managed runtime.
- Keep renderer evolution archetype-first rather than component-specific.
- Keep raw shadcn props, visual free-form config, and runtime-first authoring
  out of the public surface.

## Current State

- Phases 1 through 7 of the current artifact-focused pass are complete.
- The grouped adoption lane for `combobox`, `switch`, and `slider` is closed.
- Current implementation still exposes compatibility `profile` entries rather
  than document style config references as the main visual configuration entry;
  these entries are compatibility aliases, not reusable component style packs.
- Overlay, menu, navigation, and app-shell semantics remain outside the current
  product lane.

## Reopen Conditions

Reopen roadmap work only if one of these changes:

- The product adds new content semantics beyond the current artifact-focused
  surface.
- The product promotes isolated document-level style config from architecture
  target to executable contract.
- The product needs controlled overlay, menu, navigation, or app-shell
  semantics.
- The public contract needs new data, action, media, or round-trip semantics
  that cannot be expressed through the current shared archetypes.

## Reopen Candidates

- If local fixture or registry snapshots become costly to maintain across
  shadcn upgrades, reopen fixture and registry maintenance work.
- For the document-level config cleanup itself, use
  `spec/document-style-config-migration.md` as the execution spec.
- Establish the migration path from compatibility `profile` entries to
  document-level style config references when the configuration lane reopens,
  without adding component-level public styling knobs.
