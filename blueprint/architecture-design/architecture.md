# agent-html Architecture

本文记录 agent-html 的第一版架构主干。它是工程锚点草案，不替代 contract、type surface 或 implementation rules。

## Main Flow

Catalog 生成路径是：

```txt
standardized shadcn base catalog ─┐
                                  ├─→ Agent Component Catalog
ComponentDeclaration ─────────────┘
                                  ↓
agent writes agent-html
```

runtime 主路径是：

```txt
agent writes agent-html + render config header
        ↓
parse / validate / sanitize
        ↓
renderer
        ↓
static artifact
```

agent-html 可使用 Catalog 中登记的 base blocks 和 custom blocks，并可通过受控 render config header 选择已注册 presentation profile。

base blocks 路径是：

```txt
shadcn base component capability
        ↓
standardized shadcn base catalog
        ↓
Agent Component Catalog base blocks
```

custom blocks 路径是：

```txt
ComponentDeclaration
        ↓
Agent Component Catalog custom blocks
```

## Core Decisions

## 1. agent writes agent-html

agent 的主要输出是 agent-html。

agent-html 是 HTML 形态的积木文档。agent 负责内容结构、信息关系和表达意图，不直接负责组件实现和样式细节。

## 2. Catalog exposes building blocks

agent 通过 Agent Component Catalog 了解可用积木。

Catalog 是 agent-facing 入口。它包含 base blocks、custom blocks 和 render config schema。

base blocks 来自标准化 shadcn 基础组件能力。它们让没有 custom blocks 的场景也能拼出 agent-html。

custom blocks 来自 ComponentDeclaration。它们用于项目显式声明的业务语义组件或组合组件。

Catalog 描述组件用途、可填信息和组合边界，不暴露组件源码、内部样式和实现依赖。

base blocks 不等于直接暴露 shadcn props。Catalog 只暴露稳定、受控、可校验的最小 agent-facing props。

ComponentDeclaration 是 custom blocks 的显式声明源。custom blocks 不应从 React props、shadcn/ui props、Radix props、Tailwind class 或组件源码结构直接推导为 Catalog。

render config schema 描述 agent 可选择的 presentation profile 枚举，例如 theme、density、tone 和 width。它只选择 renderer 已注册预设，不暴露 CSS、Tailwind class、shadcn props、script 或外部资源。

## 3. parse / sanitize gates agent-html

agent-html 和 render config header 进入 renderer 前必须经过 parse / validate / sanitize。

安全层负责拒绝或清洗不透明脚本、危险属性和不受控外部资源。

实现应先把 agent-html 转为可检查结构，再生成 SanitizedAgentHtml。renderer 不应接收 cleaned HTML string 作为主输入。

render config header 必须在安全层被校验为受控枚举。未知 key / value 不得成为样式逃逸口。

diagram、chart spec、code highlight output 等二级表达输入也必须由已注册积木受控处理，不得绕过安全边界。

## 4. renderer turns blocks into page

renderer 负责把 agent-html 中的 base / custom blocks 转换为真实页面，并按已验证 RenderConfig 选择 presentation profile。

agent 不直接调用 React 组件，不直接使用完整 shadcn/ui props，也不直接输出 Tailwind class 作为主路径。

交互能力由受控 RendererBlock 提供。复杂 round-trip runtime 是显式能力，不是执行 agent 脚本的替代路径。

## 5. UI implementation stays internal

React 和 Tailwind 属于内部实现层。

shadcn/ui 属于实现材料来源。其基础组件能力可被标准化为 Catalog base blocks，但 shadcn 源码、内部 props 和 Tailwind class 不作为 agent-facing 主接口。

## 6. artifact targets static sharing

artifact 优先面向静态分享。

开发阶段可以使用 Vite preview。交付阶段应优先生成可打开、可分享、可归档的静态 artifact。

默认交付形态是目录式 static artifact。单文件 artifact 是显式 export mode，不替代默认静态目录输出。

## Non-goals

- 不以 JSON 填表式 generate UI 作为主路径。
- 不让 agent 直接写裸 CSS 或 Tailwind class 作为主路径。
- 不让 agent 直接写完整 shadcn/ui props 作为主路径。
- 不让 render config header 成为 CSS、class、style、script 或外部资源入口。
- 不默认执行 agent 输出中的脚本。
- 不把 Vite preview 当作最终交付形态。
- 不把 single-file export 当作默认交付或安全边界。
- 不把 shadcn registry 等同于 Agent Component Catalog。
