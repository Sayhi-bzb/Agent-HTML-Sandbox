# agent-html Implementation Rules

本文记录 coder 实现 agent-html 时必须遵守的约束。它不是通用代码风格指南。

## 1. core stays framework-independent

core engine 不得引入 Vite、React、shadcn/ui、Tailwind、DOM renderer、renderer adapter 或 managed runtime 构建器依赖。

parse、validate、sanitize、ComponentSchema、RenderConfig、diagnostics 和公共类型应保持可被 CLI、adapter 和 tests 复用。

## 2. shadcn/ui stays the base

新增 UI 能力应优先基于 shadcn/ui 实现。

不应为了局部便利自建一套与 shadcn/ui 平行的 UI 底座。

## 3. shadcn stays in managed runtime

shadcn/ui 可为标准组件提供实现材料，但 shadcn 源码、内部 props 和 Tailwind class 不得成为 agent-facing 主接口。

RenderConfig 可选择 renderer adapter 已注册的 shadcn-backed theme、density 或 layout preset，但不得暴露完整 shadcn props。

新增 shadcn component requirement 时，必须同步 renderer adapter、ComponentSchema 说明和 runtime doctor 检查。

## 4. component changes follow schema changes

新增、删除或修改 agent-facing 组件时，必须同步 ComponentSchema、props schema / tokens、renderer adapter 注册和 agent-facing 示例。

新增、删除或修改 render config key / value 时，必须同步 schema、parse / sanitize 和 renderer adapter profile。

## 5. standard components have fixed structure

新增标准组件前必须先定义固定结构、允许 props、允许 slots / children、默认样式和使用禁忌。

agent-facing 组件不得要求 agent 选择内部间距、布局 class、variant class 或源码结构。

## 6. examples do not expose implementation

agent-facing 示例只展示标准组件语法、props 和 slots。

agent-facing 示例不得暴露 Tailwind class、`className`、完整 shadcn/ui props、Radix props 或组件源码结构。

agent-facing 示例不得把 render config 写成 CSS、style、class、Tailwind class、shadcn props、script 或外部 URL。

## 7. schema generation fails visibly

schema 生成或同步失败不能静默通过。

失败状态应阻止继续使用过期 schema。

generated shadcn introspection 失败或 drift check 失败不能静默通过。

render config schema 生成或同步失败也不能静默通过。

## 8. generated introspection is not the public contract

generated shadcn introspection 只能作为 schema 草稿和 drift check 输入。

不得直接把 generated introspection 发布给 agent。

最终 agent-facing ComponentSchema 必须由 generated introspection 和 explicit schema overlay 合成。

新增或更新 shadcn 组件后，必须重新生成 introspection，并检查 overlay 是否仍有效。

## 9. schema does not derive from renderer props

agent-facing schema 不得直接从 React props、完整 shadcn/ui props、Radix props、Tailwind class 或组件源码结构生成。

组件实现可辅助校验，但不得替代标准组件声明。

render config schema 必须是受控声明，不得从 renderer theme object、Tailwind config 或 shadcn props 自动外泄。

## 10. style parameters are locked internally

style 参数必须锁在 renderer adapter / StandardComponent 内部。

agent-facing schema 不得暴露 `className`、`style`、Tailwind class、Radix props、DOM event handlers、`asChild` 或完整 shadcn props。

shadcn `cva` variants 可被自动抽取为草稿，但最终是否暴露、如何命名和允许哪些 value 必须由 overlay 决定。

## 11. renderer adapter consumes sanitized input

renderer adapter 只能从 SanitizedAgentHtml 渲染。

renderer adapter 不得直接接收未检查的 agent 输出。

renderer adapter 不得直接接收未检查的 render config header。

## 12. parse / sanitize stays below renderer adapter

parse / sanitize 不得调用 renderer adapter 或 UI 实现层。

安全边界应先于页面渲染发生。

parse / sanitize 不得只产出 cleaned HTML string 直通 renderer。

parse / sanitize 必须校验组件名、props、slot 结构、children 边界和 render config key / value 枚举。

## 13. secondary languages stay controlled

diagram、chart spec、code highlight output、SVG 和其他二级表达输入必须由已注册标准组件受控处理。

它们不得作为 raw HTML 或未检查输出绕过 parse / sanitize。

## 14. portable output preserves safety

portable output 不得重新引入未检查脚本、危险属性或隐式运行环境。

交付物应保留 artifact 的可检查性。

single-file export 必须显式开启，不得替代默认目录式 static artifact。

## 15. public surface changes synchronize docs and tests

公共类型表面变更必须同步 contracts、schema 和 tests。

边界变更不得只停留在实现代码中。

## 16. raw escape hatch is explicit

raw escape hatch 必须显式标记，并经过安全边界。

自由 HTML 不得成为默认实现路径。

## 17. UI libraries stay outside core

React、Tailwind、shadcn/ui 和 Vite 只能作为 managed runtime、renderer adapter、template 或 sandbox 依赖。

它们不得反向进入 core engine。

## 18. dev preview is not delivery

dev preview 不能作为最终交付假设。

dev preview 不得成为独立渲染路径。

dev preview 和 build artifact 必须共用 renderer adapter、ComponentSchema、RenderConfig、shadcn/ui 实现和 Tailwind 样式系统。

任何视觉相关修改必须在 dev preview 和 build artifact 中保持一致验证。

dev-only CSS、dev-only resource、HMR、dev overlay 或 dev server URL 不得成为最终视觉假设。

实现应优先保留静态分享路径。

## 19. CLI orchestrates managed runtime

CLI 默认创建、检查或升级用户级 managed runtime，并通过该 runtime 生成 artifact。

CLI 必须明确区分 runtime files、user files 和 package files。

CLI 不得默认把 runtime files 写入当前工作目录。

CLI 不得把 shadcn component source 复制进 core，也不得把 runtime 样式提升为 agent-facing 协议。

不得恢复 local-project mode、`init --scaffold`、`init --apply` 或 `agent-html.project.json` readiness。

## 20. dependencies declare their layer

新增依赖必须说明所在层和用途。

不应为了局部便利引入跨层依赖。

## 21. render config is finite

render config 只能使用有限枚举 key / value。

未知 key / value 必须拒绝、降级或产生明确 diagnostics。

render config 不得映射为任意 CSS、Tailwind class、inline style、script、HTML attribute passthrough 或外部资源。

## 22. CLI only orchestrates

CLI 命令只能编排 schema、compose、parse / sanitize、managed runtime、renderer adapter 和 portable output。

CLI 不得创建独立 renderer。

CLI 不得把自由 HTML、未检查 agent 输出或未检查 config 直接送入 artifact。
