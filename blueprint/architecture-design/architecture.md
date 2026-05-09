# agent-html Architecture

本文记录 agent-html 的第一版简化架构主干。它是工程锚点，不替代 contract、type surface 或 implementation rules。

## Main Flow

组件能力路径是：

```txt
shadcn/ui implementation
        ↓
standardized component schema
        ↓
agent reads props schema / tokens
        ↓
agent writes standard agent-html syntax
```

runtime 主路径是：

```txt
CLI compose / agent writes standard document
        ↓
parse / validate / sanitize
        ↓
renderer
        ↓
React output + HTML output
        ↓
static artifact
```

CLI 主路径是：

```txt
schema
        ↓
compose
        ↓
build
        ↓
static artifact
```

preview / delivery 路径是：

```txt
SanitizedAgentHtml
        ↓
renderer
        ├─→ dev preview
        ↓
Vite static build
        ↓
static artifact directory
```

agent-html 使用固定结构的标准组件语法。组件风格、布局、间距和可组合结构由项目预设，agent 只填写 props 和 slots。

示例：

```html
<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>
    <p>主体内容</p>
  </CardContent>
</Card>
```

renderer 将标准语法映射为内部 React 组件，并产出可检查的底层 HTML。React、Tailwind class 和 shadcn/ui 细节不进入 agent-facing 主接口。

`.agent.html` 是可检查中间表示和调试格式。长期主入口是 CLI 编排：`schema` 输出 agent-facing contract，`compose` 产出标准 document，`build` 生成 artifact，`config` 管理有限 presentation / output 配置。

## Core Decisions

## 1. shadcn/ui is the implementation base

项目直接使用 shadcn/ui 作为 UI 实现底座。

shadcn/ui 提供组件实现、设计系统材料和可访问 primitive。项目不再手搓一套独立底座。

shadcn/ui 的自由度必须被收束。agent-facing 层不暴露完整 shadcn props、Radix props、Tailwind class、`className` 或组件源码结构。

## 2. components are standardized

agent-facing 组件是标准化组件，不是自由拼装的 UI primitive。

每个标准组件必须定义：

- 固定结构。
- 固定风格。
- 允许 props。
- 允许 slots / children。
- 使用禁忌。

组件内部可以使用 shadcn/ui 和 Tailwind 实现，但 agent 只能通过 props 和 slots 填内容。

## 3. schema automation drafts, overlay decides

shadcn registry、组件源码和 `components.json` 可用于自动生成 schema 草稿。

自动化路径是：

```txt
shadcn registry / source / components.json
        ↓
generated shadcn introspection
        ↓
explicit schema overlay
        ↓
agent-facing ComponentSchema
```

generated shadcn introspection 可抽取 exports、`data-slot`、`cva` variants、literal union props、registry metadata、dependencies 和 docs links。

explicit schema overlay 决定哪些组件暴露给 agent、语义 props 如何命名、slot 结构是否合法、children 边界是什么，以及哪些 props 必须隐藏。

最终 agent-facing ComponentSchema 只能来自 introspection + overlay 的合成结果。不得把自动抽取结果直接发布为 agent 协议。

自动化目标是减少 schema 维护成本，不是 100% 自动生成最终协议。实现可自动生成 70%-80% 的 schema 草稿，但最终开放面必须由 overlay 白名单收束。

## 4. props schema / tokens are the agent-facing contract

agent 通过 props schema / tokens 理解组件能力。

schema 描述组件用途、可填语义 props、slot 结构和组合边界。schema 不描述内部 class、布局实现或完整 shadcn props。

组件能力变化必须同步 props schema / tokens、overlay 和 agent-facing 示例。

style 参数必须锁在 renderer / StandardComponent 内部。agent-facing schema 不暴露 `className`、`style`、Tailwind class、Radix props、DOM event handlers、`asChild` 或完整 shadcn props。

## 5. parse / sanitize gates renderer

agent-html 和 render config header 进入 renderer 前必须经过 parse / validate / sanitize。

安全层负责拒绝或清洗不透明脚本、危险属性、不受控外部资源、未知组件、非法 props 和非法 slot 结构。

实现应先把 agent-html 转为可检查结构，再生成可交给 renderer 的 sanitized structure。renderer 不应接收 cleaned HTML string 作为主输入。

render config header 只能选择已注册 profile。未知 key / value 不得成为样式逃逸口。

## 6. renderer maps standard syntax to React and HTML

renderer 负责把标准 agent-html 组件映射为内部 React 组件，并产出底层 HTML。

agent 不直接调用 React 组件，不直接使用完整 shadcn/ui props，也不直接输出 Tailwind class。

交互能力由受控标准组件提供。复杂 round-trip runtime 是显式能力，不是执行 agent 脚本的替代路径。

## 7. artifact targets static sharing

artifact 优先面向静态分享。

最终给人看的默认产物是 static artifact directory，不是 dev server URL，也不是 agent-html 源码。

默认目录形态是：

```txt
artifact/
  index.html
  assets/*.js
  assets/*.css
  assets/*
```

开发阶段可以使用 dev preview。dev preview 是同一 renderer 的开发检查形态，不是另一套渲染结果。

dev preview 和 final artifact 必须共用 ComponentSchema、RenderConfig、renderer、shadcn/ui 实现和 Tailwind 样式系统。视觉目标应保持一致。

允许差异只来自 dev tooling、资源路径、字体 / 网络策略、viewport / container 条件和显式 export mode。

交付阶段应优先生成可部署、可分享、可归档的静态 artifact。单文件 artifact 是显式 export mode，不替代默认静态目录输出。

## 8. CLI orchestrates the engine

CLI 是 agent-html engine 的主入口。

CLI 只编排 ComponentSchema、RenderConfig、parse / sanitize、renderer 和 portable output。CLI 不定义平行协议，不绕过 sanitize，不暴露 shadcn props、Tailwind class、style、script 或外部资源逃逸口。

CLI 命令词汇固定为 `schema`、`compose`、`build`、`config`。

## Non-goals

- 不自建独立 UI 底座来替代 shadcn/ui。
- 不以 JSON 填表式 generate UI 作为主路径。
- 不让 agent 直接写裸 CSS 或 Tailwind class 作为主路径。
- 不让 agent 直接写完整 shadcn/ui props 作为主路径。
- 不让 agent 改标准组件的内部结构、间距或布局规则。
- 不让 render config header 成为 CSS、class、style、script 或外部资源入口。
- 不默认执行 agent 输出中的脚本。
- 不把 Vite preview 当作最终交付形态。
- 不让 dev preview 成为独立渲染路径。
- 不把 single-file export 当作默认交付或安全边界。
- 不让 CLI 成为绕过 schema、sanitize 或 renderer 的自由 HTML 通道。
