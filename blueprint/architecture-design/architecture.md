# agent-html Architecture

本文记录 agent-html 的目标架构主干。它是工程锚点，不替代 contract 或 type surface。

## Product Shape

agent-html 的产品形态首先是：

```txt
agent work
        ↓
semantic .agent.html
        +
document style config reference
        ↓
stable shareable HTML artifact
```

agent-html 用 HTML artifact 替代冗长 Markdown agent 输出。agent-facing 层只让 agent 表达信息结构、关系、决策和反馈入口；视觉风格由独立配置层决定。配置层内部再细分为全局样式层和组件样式层，并通过 `style-ref` 选择一份已批准的完整样式方案；最终产物应让人更容易阅读、比较、分享、归档，并把反馈带回 agent 工作流。

工程形态是：

```txt
ahtml CLI + core engine + managed runtime + portable artifact output
```

CLI 负责 schema、validate、build、preview、inspect、doctor、runtime 编排，以及向 agent 暴露有限的语义组件和受控视觉配置入口。

engine 负责 agent-html 文档边界、安全边界、ComponentSchema、DocumentStyleConfigReference、RenderConfig、diagnostics 和 `SanitizedAgentHtml`。

managed runtime 负责隔离承载 renderer adapter、Vite、React、Tailwind 和 shadcn/ui 实现。默认位置是用户级 `.ahtml` 目录，不是当前工作目录。managed runtime 的 UI surface 必须来自 shadcn template / init / registry，而不是 ahtml 维护的平行 shadcn scaffold。

portable artifact output 是最终给人打开、分享和归档的静态产物。

## Main Flow

默认产品路径是：

```txt
user installs ahtml globally
        ↓
agent writes semantic agent-html document
        ↓
ahtml CLI validates and sanitizes
        ↓
managed runtime under ~/.ahtml renders
        ↓
static artifact directory
```

公开契约路径是：

```txt
semantic component contract
        +
approved style profile references
        ↓
CLI schema output
        ↓
agent reads allowed structure and visual config choices
        ↓
agent writes standard agent-html syntax
```

`spec/map.md` 记录当前链路施工状态。blueprint 是目标架构权威，map 只记录当前实现与目标链路的差距。

## Core Decisions

## 1. core owns document safety

core engine 负责把 agent-html 转成可检查、可验证、可渲染的结构。

core 可以定义 ComponentSchema、DocumentStyleConfigReference、RenderConfig、diagnostics 和 `SanitizedAgentHtml`，但不得依赖 Vite、React、shadcn/ui、Tailwind、renderer adapter 或 managed runtime 构建配置。

## 2. shadcn/ui is the implementation base

项目直接使用 shadcn/ui 作为 UI 实现底座。

shadcn template / init / registry 是 managed runtime UI surface 的 source of truth，包括 `components.json`、组件文件、global CSS、theme tokens、base layer、Tailwind 入口、依赖、icon library 和 registry item。ahtml 不维护一套平行的 shadcn UI kit、global CSS、base layer、component copy 或 pseudo template。

shadcn/ui 的自由度必须被收束。agent-facing 层不暴露完整 shadcn props、Radix props、Tailwind class、`className` 或组件源码结构。

## 3. agent-facing components are semantic standardized components

agent-facing 组件是标准化语义组件，不是自由拼装的 UI primitive。

每个标准组件必须定义：

- 固定结构。
- 固定语义用途。
- 允许的语义 props。
- 允许的 slots / children。
- 使用禁忌。

组件内部可以使用 shadcn/ui 和 Tailwind 实现，但 agent 只能通过语义 props 和 slots 填内容。

## 4. configuration layer owns visual choice

视觉选择必须先收束为已批准的完整样式方案引用，再进入 renderer。

配置层由两部分组成：

- 全局样式层：负责 theme token、light/dark 结构、字体、radius、spacing、shadow、semantic colors 及其生成逻辑。其 token 规范基线来自 shadcn 官方 theming convention。
- 组件样式层：负责受控组件视觉映射与 treatment 选择。

全局样式层的工程实现参考 `tweakcn` 的 theme model、preset 组织方式和 generator，但全局样式层本身仍以 shadcn 官方 token 规范为来源。项目不为全局样式维护另一套平行规范。

`style-ref` 是一份完整样式方案的引用 id。每个方案同时包含全局样式层配置和组件样式层配置。方案来源包括内置方案与用户方案，两类方案分目录管理。找不到引用时系统回退默认方案。方案本身必须是完整成品，不采用继承或运行时合并。

用户或调用方负责选择 document style config reference；agent 只在 schema 明确允许时写入受控视觉配置入口。RenderConfig 的默认职责是解析已批准的完整样式方案，而不是直接拼装任意视觉参数。

## 5. runtime verification facts assist maintenance, not define the contract

shadcn registry、shadcn-native managed runtime、组件源码和 managed runtime `components.json` 可用于生成内部 verification facts、renderer registry 草稿和 drift check 输入。

自动化路径是：

```txt
shadcn registry / shadcn-native managed runtime / components.json / component source
        ↓
runtime verification facts
        ↓
contract verification + renderer registry inputs
```

这些 facts 可抽取 exports、`data-slot`、dependencies、registry metadata、required files、required exports、CSS/base surface identity 和 blocked/internal prop candidates。必要时也可保留 `cva` variants 或 literal union props 作为审查材料，但它们不是公开契约本身。

## 6. semantic contract decides the agent-facing surface

agent 通过 ComponentSchema、ComponentPropSchema、ComponentToken 和已批准的文档级视觉配置入口理解能力。

schema 描述组件用途、可填语义 props、slot 结构、组合边界和 style config 兼容性。schema 不描述内部 class、布局实现或完整 shadcn props。

全局样式参数和组件样式参数都不得直接进入正文语义协议。agent-facing schema 不暴露 `className`、`style`、Tailwind class、Radix props、DOM event handlers、`asChild`、完整 shadcn props、全局主题 token 或组件样式细节。

## 7. generic adaptation is the default runtime path

组件接入的默认工程路径是通用 contract + 通用 resolver，而不是逐组件手写 adapter。

通用路径是：

```txt
semantic component contract
        +
runtime verification facts
        ↓
UiComponentSchema + UiSlotSchema
        ↓
generic renderer registry
        ↓
recursive resolver renders shadcn/native exports
```

## 8. parse / sanitize gates renderer adapter

agent-html 和 render config header 进入 renderer adapter 前必须经过 parse / validate / sanitize。

安全层负责拒绝或清洗不透明脚本、危险属性、不受控外部资源、未知组件、非法 props 和非法 slot 结构。

实现应先把 agent-html 转为可检查结构，再生成可交给 renderer adapter 的 sanitized structure。renderer adapter 不应接收 cleaned HTML string 作为主输入。

render config header 或等价文档级配置入口只能选择已批准的 document style config reference。未知 key / value 不得成为样式逃逸口。

## 9. artifact targets static sharing

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

dev preview 和 final artifact 必须共用 ComponentSchema、RenderConfig、renderer adapter、shadcn/ui 实现和 Tailwind 样式系统。视觉目标应保持一致。

## 10. CLI orchestrates the engine

CLI 是 agent-html engine 的主入口。

CLI 只编排 ComponentSchema、DocumentStyleConfigReference、RenderConfig、parse / sanitize、managed runtime、renderer adapter 和 portable output。CLI 不定义平行协议，不绕过 sanitize，不暴露 shadcn props、Tailwind class、style、script 或外部资源逃逸口。

`ahtml setup` 默认初始化或检查 shadcn-native managed runtime。首次 `status`、`doctor`、`build` 或 `preview` 可以用默认 shadcn preset 自动修复 runtime，但修复必须走 shadcn template / init / registry 的完整 UI surface。CLI 不提供写入当前工作目录的 project scaffold 模式，也不得把项目样式提升为 agent-facing 协议。

## Non-goals

- 不自建独立 UI 底座来替代 shadcn/ui。
- 不维护平行的 shadcn UI kit、global CSS、base layer、component copy 或 pseudo template 作为主路径。
- 不用截断的 shadcn CSS、手写 base layer 或 `apply --only theme` + `add` 组合替代 shadcn template / init。
- 不把逐组件手写 adapter 作为 shadcn-backed 组件接入主路径。
- 不以 JSON 填表式 generate UI 作为主路径。
- 不让 agent 直接写裸 CSS 或 Tailwind class 作为主路径。
- 不让 agent 直接写完整 shadcn/ui props、Radix props、`asChild` 或组件源码结构作为主路径。
- 不让 agent 改标准组件的内部结构、间距、布局规则或视觉实现。
- 不让 RenderConfig 退化为自由视觉参数包或与 `tweakcn` 平行的全局主题体系。
- 不让 render config header 成为 CSS、class、style、script 或外部资源入口。
- 不默认执行 agent 输出中的脚本。
- 不把 Vite、React、shadcn/ui 或 Tailwind 做成 core engine 依赖。
- 不把 Vite app 当作 ahtml 产品本体。
- 不把当前工作目录当作默认 renderer runtime。
- 不把 Vite preview 当作最终交付形态。
- 不让 dev preview 成为独立渲染路径。
- 不把 single-file export 当作默认交付或安全边界。
- 不让 CLI 成为绕过 schema、sanitize 或 renderer 的自由 HTML 通道。
