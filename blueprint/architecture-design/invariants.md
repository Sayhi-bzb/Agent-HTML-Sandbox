# agent-html Invariants

本文记录 agent-html 的不可破坏系统假设。后续 contract、type surface 和 implementation rules 必须遵守这些约束。

## 1. core engine is framework-independent

ahtml core 不依赖 Vite、React、shadcn/ui、Tailwind、renderer adapter 或 managed runtime 构建配置。

这些依赖只能出现在 managed runtime、renderer adapter、template 或 sandbox 中。

## 2. shadcn/ui is the implementation base

项目直接使用 shadcn/ui 作为 UI 实现底座。

项目不维护一套独立 UI 底座来替代 shadcn/ui。

## 3. shadcn lives in managed runtime

shadcn components、theme、CSS variables 和 Tailwind 配置若被采用，只能属于 managed runtime。

ahtml 可以编排 runtime bootstrap，但不把 shadcn 源码或样式作为 core 内置协议。

## 4. agent-facing components are standardized

agent-facing 组件必须是固定结构、固定风格、固定组合边界的标准组件。

agent 可以填写 props 和 slots，不可以改内部结构、间距、布局规则或样式实现。

## 5. props schema / tokens are the agent-facing authority

props schema / tokens 是 agent-facing 组件能力入口。

组件能力变化必须同步 props schema / tokens 和 agent-facing 示例。

## 6. implementation props stay internal

Tailwind class、`className`、完整 shadcn/ui props、Radix props 和组件源码结构不作为 agent-facing 主接口。

它们属于组件实现层。

## 7. parse / sanitize gates renderer adapter

agent-html 进入 renderer adapter 前必须经过 parse / sanitize。

renderer adapter 不接收未检查的 agent 输出。

## 8. scripts are disabled by default

agent 输出中的脚本默认不执行。

交互能力应由受控标准组件提供。

## 9. artifact targets static sharing

artifact 默认面向静态分享。

dev preview 不应成为最终交付假设。

默认交付物是包含 `index.html`、CSS / JS bundle 和 assets 的 static artifact directory。

## 9.1. current directory is not the runtime

当前工作目录默认只承载输入和输出。

Vite、React、Tailwind、shadcn/ui、renderer adapter 和 generated runtime files 默认收纳在用户级 managed runtime。

## 10. dev preview shares the renderer adapter

dev preview 不得成为独立渲染路径。

dev preview 和 final artifact 必须共用 renderer adapter、ComponentSchema、RenderConfig 和样式系统。

两者视觉目标应保持一致。差异只应来自 dev tooling、资源路径、字体 / 网络策略、viewport / container 条件和显式 export mode。

## 11. renderer adapter uses registered components

renderer adapter 只渲染已注册标准组件。

未知标签不得绕过安全边界执行。

## 12. public surface changes are synchronized

公共类型表面变更必须同步 contracts、schema 和 tests。

边界变更不应只停留在实现代码中。

## 13. examples must not leak implementation

agent-facing 示例不得泄漏组件内部实现。

示例不应诱导 agent 写 `className`、Tailwind class、完整 shadcn/ui props、Radix props 或内部结构。

## 14. raw escape hatch is explicit

raw escape hatch 必须显式标记，并经过安全边界。

自由 HTML 不应成为默认路径。

## 15. render config selects profiles only

render config header 只能选择已注册 presentation profile。

它不得成为 CSS、Tailwind class、shadcn props、script、style 或外部资源的逃逸口。
