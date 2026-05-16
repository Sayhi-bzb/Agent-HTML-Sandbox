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

- README、docs、skill guidance、CLI help 和 schema prompt 继续保持
  semantic component contract 与受控视觉配置 vocabulary。当前兼容 surface
  可继续暴露 `profile`，但目标架构不再把它视为唯一长期视觉入口。
- Public agent-facing rules derive from the shared public agent contract;
  runtime verification and renderer parity derive from the shared runtime
  contract.
- CLI schema 继续暴露受控文档级视觉配置入口；当前实现可继续通过
  `profile` 兼容暴露该入口。
- 组件级 visual mapping 说明仅作为内部设计与 renderer guardrail，不升级为
  schema、prompt 或 `.agent.html` 的 public config key。
- Public 状态样参数保持 semantic snapshot 语义，不回退成 shadcn
  `defaultValue`、`open`、`onValueChange` 一类控制面。
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

## If Shadcn Debt Reopens

- Inspect upstream shadcn docs and examples before changing runtime behavior.
- Compare the current runtime implementation against the official shadcn
  component composition, not just the current local fixture snapshot.
- Update schema, renderer, runtime setup, doctor checks, and artifact proofs
  together for any shadcn-alignment change.
- Verify with narrow renderer tests first, then runtime surface checks, then
  heavy CLI artifact flows.
