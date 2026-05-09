# agent-html Implementation Rules

本文记录 coder 实现 agent-html 时必须遵守的约束。它不是通用代码风格指南。

## 1. Catalog changes follow component changes

新增、删除或修改 agent-facing 组件时，必须同步 Catalog 来源和 agent-facing 示例。

## 2. Examples do not expose implementation

agent-facing 示例不得暴露 Tailwind class、`className`、shadcn/ui 内部 props 或组件源码结构。

## 3. Catalog generation fails visibly

Catalog 生成或同步失败不能静默通过。

失败状态应阻止继续使用过期 Catalog。

## 4. renderer consumes sanitized input

renderer 只能从 SanitizedAgentHtml 渲染。

renderer 不得直接接收未检查的 agent 输出。

## 5. parse / sanitize stays below renderer

parse / sanitize 不得调用 renderer 或 UI 实现层。

安全边界应先于页面渲染发生。

## 6. portable output preserves safety

portable output 不得重新引入未检查脚本、危险属性或隐式运行环境。

交付物应保留 artifact 的可检查性。

## 7. public surface changes synchronize docs and tests

公共类型表面变更必须同步 contracts、Catalog 和 tests。

边界变更不得只停留在实现代码中。

## 8. raw escape hatch is explicit

raw escape hatch 必须显式标记，并经过安全边界。

自由 HTML 不得成为默认实现路径。

## 9. UI libraries stay internal

React、shadcn/ui 和 Tailwind 只作为内部实现层。

它们不得成为 agent-facing 主接口。

## 10. dev preview is not delivery

dev preview 不能作为最终交付假设。

实现应优先保留静态分享路径。

## 11. dependencies declare their layer

新增依赖必须说明所在层和用途。

不应为了局部便利引入跨层依赖。
