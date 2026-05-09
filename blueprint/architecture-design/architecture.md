# agent-html Architecture

本文记录 agent-html 的第一版架构主干。它是工程锚点草案，不替代 contract、type surface 或 implementation rules。

## Main Flow

Catalog 生成路径是：

```txt
ComponentDeclaration
        ↓
Agent Component Catalog
        ↓
agent writes agent-html
```

runtime 主路径是：

```txt
agent writes agent-html
        ↓
parse / sanitize
        ↓
renderer
        ↓
static artifact
```

## Core Decisions

## 1. agent writes agent-html

agent 的主要输出是 agent-html。

agent-html 是 HTML 形态的积木文档。agent 负责内容结构、信息关系和表达意图，不直接负责组件实现和样式细节。

## 2. Catalog exposes building blocks

agent 通过 Agent Component Catalog 了解可用积木。

Catalog 是 agent-facing 入口。它描述组件用途、可填信息和组合边界，不暴露组件源码、内部样式和实现依赖。

Catalog 来自 ComponentDeclaration。它是 agent 编写 agent-html 的前置输入，不是 renderer 的副产品。

## 3. parse / sanitize gates agent-html

agent-html 进入 renderer 前必须经过 parse / sanitize。

安全层负责拒绝或清洗不透明脚本、危险属性和不受控外部资源。

## 4. renderer turns blocks into page

renderer 负责把 agent-html 中的语义积木转换为真实页面。

agent 不直接调用 React 组件，不直接使用 shadcn/ui props，也不直接输出 Tailwind class 作为主路径。

## 5. UI implementation stays internal

React、shadcn/ui 和 Tailwind 属于内部实现层。

它们可以用于组件实现、样式封装和交互基础设施，但不作为 agent-facing 主接口。

## 6. artifact targets static sharing

artifact 优先面向静态分享。

开发阶段可以使用 Vite preview。交付阶段应优先生成可打开、可分享、可归档的静态 artifact。

## Non-goals

- 不以 JSON 填表式 generate UI 作为主路径。
- 不让 agent 直接写裸 CSS 或 Tailwind class 作为主路径。
- 不默认执行 agent 输出中的脚本。
- 不把 Vite preview 当作最终交付形态。
- 不把 shadcn registry 等同于 Agent Component Catalog。
