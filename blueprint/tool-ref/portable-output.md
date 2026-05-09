# Portable Output Tool Reference

本文记录 agent-html 在 portable output 层的工具采购判断。正式边界以 architecture、invariants 和 contracts 为准。

## Decision

采购 `Vite static build` 作为默认 directory artifact 输出。

采购 `vite-plugin-singlefile` 作为显式 local-openable single-file export。

`Vite preview` 只用于开发检查，不作为交付形态。

## Fit

`Vite static build` 适合默认交付：

- 输出 hosted / deployable static directory。
- 支持复杂 artifact、分包资源、图片、字体和调试检查。
- 配合 `base: "./"` 或 `base: ""`，可适配未知静态部署路径。

默认 directory artifact 形态：

```txt
artifact/
  index.html
  assets/
```

`vite-plugin-singlefile` 适合显式导出：

- 输出 local-openable / offline-share single HTML。
- 适合 demo、归档、PR explainer 和一次性 spec。
- 不应成为默认输出模式。

## Not For

- 不把 `Vite preview` URL 当作 portable artifact。
- 不默认强制 single-file。
- 不让 single-file 内联替代 parse / validate / sanitize。
- 不隐式依赖 CDN、远程字体、外部 worker 或 dev server。

## Specific Risks

- single HTML 可能过大，影响审查、加载、分享和 diff。
- 内联 JS / CSS 会增加 CSP 难度。
- file URL 场景会限制 routing、cookies、worklets 和部分浏览器能力。
- dynamic imports、code splitting、workers、wasm、字体和大图片不应假设自动 portable。
- directory artifact 更适合复杂交互和多资源 artifact，但不默认承诺 file URL 直接打开。
- 输出前需要检查 source maps、绝对路径、外部 URL、CDN 和远程字体泄漏。

## Follow-up

- 定义 external resource policy。
- 定义 single-file export 的体积阈值。
- 建立 local-openable、static-server、hosted-static 三类验证矩阵。
