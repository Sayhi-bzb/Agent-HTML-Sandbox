# agent-html Implementation Rules

本文记录 coder 实现 agent-html 时必须遵守的约束。它不是通用代码风格指南。

## 1. Catalog changes follow component changes

新增、删除或修改 agent-facing 组件时，必须同步 Catalog 来源和 agent-facing 示例。

新增、删除或修改 render config key / value 时，必须同步 Catalog schema、parse / sanitize 和 renderer profile。

## 2. Examples do not expose implementation

agent-facing 示例不得暴露 Tailwind class、`className`、完整 shadcn/ui props 或组件源码结构。

agent-facing 示例不得把 render config 写成 CSS、style、class、Tailwind class、shadcn props、script 或外部 URL。

## 3. Catalog generation fails visibly

Catalog 生成或同步失败不能静默通过。

失败状态应阻止继续使用过期 Catalog。

render config schema 生成或同步失败也不能静默通过。

## 4. Catalog does not derive from renderer props

agent-facing Catalog 不得直接从 React props、完整 shadcn/ui props、Radix props、Tailwind class 或组件源码结构生成。

base blocks 来自标准化 shadcn base catalog。custom blocks 来自 ComponentDeclaration。

组件实现可辅助校验，但不得替代 base/custom block 声明。

render config schema 必须是受控声明，不得从 renderer theme object、Tailwind config 或 shadcn props 自动外泄。

## 5. renderer consumes sanitized input

renderer 只能从 SanitizedAgentHtml 渲染。

renderer 不得直接接收未检查的 agent 输出。

renderer 不得直接接收未检查的 render config header。

## 6. parse / sanitize stays below renderer

parse / sanitize 不得调用 renderer 或 UI 实现层。

安全边界应先于页面渲染发生。

parse / sanitize 不得只产出 cleaned HTML string 直通 renderer。

parse / sanitize 必须校验 render config header 的 key / value 枚举，并把结果写入 SanitizedAgentHtml。

## 7. secondary languages stay controlled

diagram、chart spec、code highlight output、SVG 和其他二级表达输入必须由已注册积木受控处理。

它们不得作为 raw HTML 或未检查输出绕过 parse / sanitize。

## 8. portable output preserves safety

portable output 不得重新引入未检查脚本、危险属性或隐式运行环境。

交付物应保留 artifact 的可检查性。

single-file export 必须显式开启，不得替代默认目录式 static artifact。

## 9. public surface changes synchronize docs and tests

公共类型表面变更必须同步 contracts、Catalog 和 tests。

边界变更不得只停留在实现代码中。

## 10. raw escape hatch is explicit

raw escape hatch 必须显式标记，并经过安全边界。

自由 HTML 不得成为默认实现路径。

## 11. UI libraries stay internal

React 和 Tailwind 只作为内部实现层。

shadcn/ui 可为 base blocks 提供实现材料，但 shadcn 源码、内部 props 和 Tailwind class 不得成为 agent-facing 主接口。

RenderConfig 可选择 renderer 已注册的 shadcn theme、density 或 layout preset，但不得暴露完整 shadcn props。

## 12. dev preview is not delivery

dev preview 不能作为最终交付假设。

实现应优先保留静态分享路径。

## 13. dependencies declare their layer

新增依赖必须说明所在层和用途。

不应为了局部便利引入跨层依赖。

## 14. render config is finite

render config 只能使用有限枚举 key / value。

未知 key / value 必须拒绝、降级或产生明确 diagnostics。

render config 不得映射为任意 CSS、Tailwind class、inline style、script、HTML attribute passthrough 或外部资源。
