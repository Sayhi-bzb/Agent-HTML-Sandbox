# Document Style Config Migration Record

本文记录 `ahtml` 主链路从 `profile` 兼容层迁移到
`DocumentStyleConfigReference + style-ref` 模型后的收尾结果。

它不是 blueprint，也不是当前 pass 的状态快照。当前稳定态仍以
`spec/map.md`、`spec/roadmap.md` 和 `spec/phase-checklist.md` 为准。

## Result

主链路已完成这一条迁移：

```txt
legacy profile compatibility surface
  -> document style config reference-first contract wording
  -> style-ref public syntax
  -> checked RenderConfig
  -> renderer/runtime internal tokens
```

- `DocumentStyleConfigReference` 成为主架构、type surface 和 contract 的主语。
- `style-ref` 成为唯一 public serialized visual config syntax。
- `profile` 已从 active public contract、checked `RenderConfig` 和 CLI output 中移除。
- 公开视觉配置继续只停留在 document level，不引入 component-level public
  styling knobs。
- renderer/runtime 继续只消费 checked visual config 与 resolved tokens，不感知
  agent-facing header 词汇。

## Final Decisions

- `<meta-agent style-ref="...">` 是唯一公开序列化入口。
- `profile` 不再是 public syntax，也不再是 checked `RenderConfig` 字段。
- `PresentationProfile` / `PresentationProfileRegistry` 不再属于 active public
  surface。
- `RenderConfig` 只记录 `documentStyleConfigReference` 和 resolved internal
  tokens。

## Work Surfaces

## Verification Snapshot

- core render config 只接受 `style-ref`
- sanitize 拒绝旧 `profile` header
- CLI prompt/schema/inspect 只输出 document-style-config 模型
- docs/examples 已切到 `style-ref`

## Acceptance Gates

旧 `profile` syntax 若需再次引入，必须作为新的架构决策重开，而不是在当前
contract 内恢复兼容层。
