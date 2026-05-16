# agent-html Architecture

本文记录 agent-html 的目标架构主干。它是工程锚点，不替代 contract、type surface 或 implementation rules。

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

agent-html 用 HTML artifact 替代冗长 Markdown agent 输出。agent-facing 层只让 agent 表达信息结构、关系、决策和反馈入口；视觉风格由独立配置层决定。兼容期可以保留命名 profile 作为 style config alias，但长期目标是不把 profile 当作唯一公开视觉入口；最终产物应让人更容易阅读、比较、分享、归档，并把反馈带回 agent 工作流。

应把“用什么积木表达内容”和“这些积木最终呈现成什么视觉风格”视为两层不同问题：前者属于 agent-facing 使用层，后者属于受控配置层或 presentation 层。

工程形态是：

```txt
ahtml CLI + core engine + managed runtime + portable artifact output
```

CLI 负责 schema、validate、build、preview、inspect、doctor、runtime 编排，以及向 agent 暴露有限的语义组件和受控视觉配置入口。

engine 负责 agent-html 文档边界、安全边界、ComponentSchema、DocumentStyleConfigReference、compatibility PresentationProfile、diagnostics 和 `SanitizedAgentHtml`。

managed runtime 负责隔离承载 renderer adapter、Vite、React、Tailwind 和 shadcn/ui 实现。默认位置是用户级 `.ahtml` 目录，不是当前工作目录。managed runtime 的 UI surface 必须来自 shadcn template / init / registry，而不是 ahtml 维护的平行 shadcn scaffold。

portable artifact output 是最终给人打开、分享和归档的静态产物。

CLI、engine、sanitize、managed runtime 和 shadcn/ui 都是支撑产品形态的实现机制，不应成为用户或 agent 的第一层心智。

## Main Flow

默认产品路径是：

```txt
user installs ahtml globally
        ↓
user chooses or accepts a document style config reference
        ↓
(compatibility profile aliases may survive during migration)
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
approved document style config references
        ↓
CLI schema output
        ↓
agent reads allowed structure and visual config choices
        ↓
agent writes standard agent-html syntax
```

内部实现路径是：

```txt
managed runtime shadcn/ui implementation
        ↓
runtime verification facts + drift checks
        ↓
renderer registry inputs + contract verification
        ↓
generic renderer registry / resolver
        ↓
shadcn/native React output
```

`spec/map.md` 记录当前链路施工状态。blueprint 是目标架构权威，map 只记录当前实现与目标链路的差距。

runtime 主路径是：

```txt
agent writes standard document
        ↓
ahtml core parse / validate / sanitize
        ↓
SanitizedAgentHtml
        ↓
renderer adapter
        ↓
React output + HTML output
        ↓
artifact
```

CLI 主路径是：

```txt
ComponentSchema + approved visual config entries
        ↓
schema / validate / build
        ↓
static artifact
```

preview / delivery 路径是：

```txt
SanitizedAgentHtml
        ↓
renderer adapter
        ├─→ dev preview
        ↓
managed runtime build
        ↓
static artifact directory
```

agent-html 使用固定结构的标准组件语法。组件风格、布局、间距和组合规则由独立配置层、兼容 profile alias 和 runtime 内部实现共同决定，agent 只填写语义 props 和 slots。标准语法可以保留 `<card>`、`<tabs>` 等便捷形式，但 sanitize 后必须能归一到同一套语义 component model。

示意：

```txt
document metadata
  -> approved style config reference

document body
  -> semantic card / alert / table nodes
```

renderer adapter 通过通用 registry / resolver 将标准语义节点映射为 managed runtime 中的 UI 实现，并产出可检查的底层 HTML。React、Tailwind class、`className`、Radix props 和 shadcn/ui 细节不进入 agent-facing 主接口。

`.agent.html` 是唯一 agent-facing document 输入、可检查中间表示和调试格式。主入口是 CLI 编排：`schema` 输出语义 contract 和视觉配置选择，`validate` 检查 document，`build` 生成 artifact，`preview` 做本地验收，`inspect` 和 `doctor` 做基础调试，`config` 管理有限的 runtime / output 配置。

旧 project-local Vite/shadcn scaffold 已移除，不是兼容基线。目标架构应把 renderer state 和 runtime files 收纳进 managed runtime。

## Core Decisions

## 1. core engine owns document safety

core engine 负责把 agent-html 转成可检查、可验证、可渲染的结构。

core 可以定义 ComponentSchema、DocumentStyleConfigReference、compatibility PresentationProfile、RenderConfig、diagnostics 和 `SanitizedAgentHtml`，但不得依赖 Vite、React、shadcn/ui、Tailwind、renderer adapter 或 managed runtime 构建配置。

## 2. shadcn/ui is the internal implementation base

项目直接使用 shadcn/ui 作为 UI 实现底座。

shadcn/ui 提供组件实现、设计系统材料和可访问 primitive。项目不再手搓一套独立底座。

shadcn template / init / registry 是 managed runtime UI surface 的 source of truth，包括 `components.json`、组件文件、global CSS、theme tokens、base layer、Tailwind 入口、依赖、icon library 和 registry item。ahtml 不维护一套平行的 shadcn UI kit、global CSS、base layer、component copy 或 pseudo template。

artifact build 仍然是产品主路径，但 build project 必须是 shadcn-template-derived managed runtime。ahtml 可以向其中注入 renderer app、SSR/build glue、sanitized document、renderer verification data 和 diagnostics，不得替换 shadcn template surface。

shadcn/ui 的自由度必须被收束。agent-facing 层不暴露完整 shadcn props、Radix props、Tailwind class、`className` 或组件源码结构。

shadcn components、theme、CSS variables、base CSS layer、Tailwind 配置和 registry metadata 若被采用，只能属于 managed runtime。ahtml 可以编排 runtime bootstrap，但不把它们提升为 core engine 或 agent-facing 协议。

`shadcn add` 只安装 registry items，不等于完整 runtime initialization。`shadcn apply --only theme` 只更新有限 preset 部分，也不等于完整 template/init。managed runtime bootstrap 不得用 `apply --only theme` + `add` 伪装成完整 shadcn template。

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

视觉选择必须先收束为已批准的 document style config reference，再进入 renderer。兼容期可以保留命名 presentation profile 作为 alias 或简化 preset，但它不应继续作为长期唯一公开视觉入口。

使用层与配置层必须分离。使用层面，agent 只消费标准组件和标准模板；配置层面，用户或调用方可以通过独立配置决定这些标准积木的视觉实现。

配置层可以调整 theme、density、card treatment、table treatment、badge treatment、emphasis 和 width 等受控视觉规则，但这种调整只影响外观映射，不改变组件语义、结构边界或 agent 的调用方式。

独立配置层可以在内部绑定 theme、density、card treatment、table treatment、badge treatment、emphasis 和 width 等受控 token，也可以进一步控制标准积木的组件级视觉映射；这些实现细节不应默认平铺成 agent-facing prop bag。

PresentationProfile 若继续存在，应只作为兼容 alias 或简化视觉档位，不直接等于长期配置模型本身。

用户或调用方负责选择 document style config reference，或在兼容期选择 profile alias；agent 只在 schema 明确允许时写入受控视觉配置入口。RenderConfig 的默认职责是解析已批准的视觉配置选择，而不是直接拼装视觉参数。

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

自动化目标是降低 contract、runtime check 和 renderer 维护成本，不是把 shadcn API 原样提炼给 agent。

## 6. semantic contract decides the agent-facing surface

agent 通过 ComponentSchema、ComponentPropSchema、ComponentToken 和已批准的文档级视觉配置入口理解能力。

schema 描述组件用途、可填语义 props、slot 结构、组合边界和 profile / style config 兼容性。schema 不描述内部 class、布局实现或完整 shadcn props。

最终开放面必须由显式声明收束。实现可以自动生成审查草稿，但最终对 agent 开放什么、如何命名、允许哪些 values、哪些视觉差异应该折叠进兼容 profile 或独立 style config layer，都必须由项目显式决定。

style 参数必须锁在 renderer adapter / StandardComponent 内部。agent-facing schema 不暴露 `className`、`style`、Tailwind class、Radix props、DOM event handlers、`asChild` 或完整 shadcn props。

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

`card`、`tabs`、`accordion`、`table`、`alert`、`badge` 等 shadcn-backed 能力应尽量走同一套 slot、export 和 safe prop resolution 规则。逐组件手写 adapter 只能作为 legacy migration 或明确 unsupported 的临时兼容层，并必须记录移除条件。

## 8. parse / sanitize gates renderer adapter

agent-html 和 render config header 进入 renderer adapter 前必须经过 parse / validate / sanitize。

安全层负责拒绝或清洗不透明脚本、危险属性、不受控外部资源、未知组件、非法 props 和非法 slot 结构。

实现应先把 agent-html 转为可检查结构，再生成可交给 renderer adapter 的 sanitized structure。renderer adapter 不应接收 cleaned HTML string 作为主输入。

render config header 或等价文档级配置入口只能选择已批准的 document style config reference，或在兼容期选择映射到该配置层的 profile alias。未知 key / value 不得成为样式逃逸口。

## 9. renderer adapter maps semantic contract to internal UI

renderer adapter 负责把标准语义组件通过通用 registry / resolver 映射为 managed runtime 中的 UI 实现，并产出底层 HTML。

每个 exposed ComponentSchema 必须有明确 renderer capability：可由通用 shadcn resolver 覆盖、可由 native semantic resolver 覆盖、可由 composite resolver 覆盖，或显式 unsupported。没有 renderer capability 的组件不得进入默认 agent-facing schema。

renderer capability 不等于逐组件手写 adapter。它应证明通用 resolver 能根据 ui / slot schema、required registry items、safe prop mapping 和 diagnostics policy 渲染该组件。

已注册标准组件不得静默退化为 generic fallback。fallback 只能用于诊断、内部未注册节点或显式 unsupported 状态，不能吞掉已注册组件的语义 props。

agent 不直接调用 React 组件，不直接使用完整 shadcn/ui props，也不直接输出 Tailwind class。

交互能力由受控标准组件提供。复杂 round-trip runtime 是显式能力，不是执行 agent 脚本的替代路径。

## 10. artifact targets static sharing

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

开发阶段可以使用 dev preview。dev preview 是同一 renderer adapter 的开发检查形态，不是另一套渲染结果。

dev preview 和 final artifact 必须共用 ComponentSchema、PresentationProfile、RenderConfig、renderer adapter、shadcn/ui 实现和 Tailwind 样式系统。视觉目标应保持一致。

允许差异只来自 dev tooling、资源路径、字体 / 网络策略、viewport / container 条件和显式 export mode。

交付阶段应优先生成可部署、可分享、可归档的静态 artifact。单文件 artifact 是显式 export mode，不替代默认静态目录输出。

## 11. CLI orchestrates the engine

CLI 是 agent-html engine 的主入口。

CLI 只编排 ComponentSchema、PresentationProfile、RenderConfig、parse / sanitize、managed runtime、renderer adapter 和 portable output。CLI 不定义平行协议，不绕过 sanitize，不暴露 shadcn props、Tailwind class、style、script 或外部资源逃逸口。

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
- 不让 RenderConfig 成为自由视觉参数包。
- 不让 render config header 成为 CSS、class、style、script 或外部资源入口。
- 不默认执行 agent 输出中的脚本。
- 不把 Vite、React、shadcn/ui 或 Tailwind 做成 core engine 依赖。
- 不把 Vite app 当作 ahtml 产品本体。
- 不把当前工作目录当作默认 renderer runtime。
- 不把 Vite preview 当作最终交付形态。
- 不让 dev preview 成为独立渲染路径。
- 不把 single-file export 当作默认交付或安全边界。
- 不让 CLI 成为绕过 schema、sanitize 或 renderer 的自由 HTML 通道。
