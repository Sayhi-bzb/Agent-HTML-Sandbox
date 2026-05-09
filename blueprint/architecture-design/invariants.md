# agent-html Invariants

本文记录 agent-html 的不可破坏系统假设。后续 contract、type surface 和 implementation rules 必须遵守这些约束。

## 1. agent does not read component source by default

agent 不以读取组件源码作为常规路径。

组件使用信息应通过 Agent Component Catalog 暴露。

## 2. Catalog is the agent-facing component authority

Agent Component Catalog 是 agent-facing 组件能力入口。

Catalog 包含 base blocks 和 custom blocks。

Catalog 包含 render config schema。

组件能力变化必须同步反映到 Catalog。

## 3. implementation props stay internal

Tailwind class 和完整 shadcn/ui props 不作为 agent-facing 主接口。

它们属于组件实现层。

## 4. parse / sanitize gates renderer

agent-html 进入 renderer 前必须经过 parse / sanitize。

renderer 不接收未检查的 agent 输出。

## 5. scripts are disabled by default

agent 输出中的脚本默认不执行。

交互能力应由受控组件提供。

## 6. artifact targets static sharing

artifact 默认面向静态分享。

dev preview 不应成为最终交付假设。

## 7. renderer uses registered blocks

renderer 只渲染已注册积木。

未知标签不得绕过安全边界执行。

## 8. public surface changes are synchronized

公共类型表面变更必须同步 contract、Catalog 和 tests。

边界变更不应只停留在实现代码中。

## 9. examples must not leak implementation

agent-facing 示例不得泄漏组件内部实现。

示例不应诱导 agent 写 `className`、Tailwind class 或内部 props。

## 10. raw escape hatch is explicit

raw escape hatch 必须显式标记，并经过安全边界。

自由 HTML 不应成为默认路径。

## 11. render config selects profiles only

render config header 只能选择已注册 presentation profile。

它不得成为 CSS、Tailwind class、shadcn props、script、style 或外部资源的逃逸口。
