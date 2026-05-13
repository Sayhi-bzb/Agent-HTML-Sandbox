# agent-html Rendering Chain Map

This map tracks the construction state of the product chain from shadcn runtime
materials to the final HTML artifact. It exists to make the current gap visible:
the user can install shadcn components, and the agent can write valid
`.agent.html`, but the renderer still has to translate agent-html semantics into
real shadcn/native UI.

Blueprint is the target architecture authority. This file is the current
construction map: it records where implementation has caught up with the
blueprint and where the chain is still incomplete.

## Chain Comparison

Target chain:

```txt
shadcn template / init / registry
  -> shadcn-native managed runtime surface
  -> generic capability extraction
  -> ui / slot capability schema
  -> safe prompt schema choices
  -> agent writes .agent.html
  -> generic renderer registry / resolver
  -> resolver maps agent-html to shadcn/native React
  -> shadcn/native render
  -> portable HTML artifact
```

Current chain:

```txt
shadcn registry facts + package-local runtime-template
  -> schema exposes first-pass renderable components plus structural children
  -> agent writes valid .agent.html
  -> runtime renderer uses a centralized component / slot-aware registry
  -> first-pass shadcn/native components render as real structures
  -> portable HTML artifact with first-pass coverage
```

Current architecture gap: the renderer pipeline now reaches real first-pass
components, but runtime procurement is still carrying old technical debt. The
desired base is shadcn-native template/init/registry; package-local component
copies, hand-written shadcn CSS, truncated base layers, or `apply --only theme`
plus `add` are not acceptable as the long-term runtime surface.

## Final Decisions

These decisions are locked for the next implementation pass.

### Agent-facing syntax

The formal generic syntax is `<ui>` / `<slot>`.

Example target shape:

```html
<ui name="tabs" default-value="bio">
  <slot name="tabs-list">
    <slot name="tabs-trigger" value="bio">Bio</slot>
    <slot name="tabs-trigger" value="work">Work</slot>
  </slot>
  <slot name="tabs-content" value="bio">...</slot>
  <slot name="tabs-content" value="work">...</slot>
</ui>
```

Semantic sugar such as `<tabs>` / `<tab>` is not the primary protocol. If it
returns later to reduce agent cognitive load, it must be generated from the
same ui/slot capability model and sanitize back into that model.

### Component scope

Remove ahtml custom controls from public schema, prompt output, docs, examples,
and tests:

- `choice-group`
- `slider-control`
- `feedback-box`
- `progress-meter`

Do not immediately replace them with `toggle-group`, `slider`, `textarea`, or
`progress`. Those can return later only as real shadcn-backed capabilities
through the generic registry / resolver.

First-pass renderable components:

- shadcn-backed: `card`, `tabs`, `accordion`, `alert`, `badge`, `separator`,
  `table`
- native semantic: `list`

### Honest schema

Prompt schema must only show renderable components by default. JSON schema and
doctor may show full capability state, including planned or unsupported
components, but unsupported components must not be advertised as normal
agent-facing choices.

Build and validate must not silently turn registered-but-unrenderable
components into generic section fallback. They should produce clear diagnostics.

### Runtime boundary

ahtml uses its own managed runtime. A user's project-local shadcn install is not
evidence of ahtml render support.

That managed runtime must be created from shadcn template / init / registry.
shadcn is the source of truth for `components.json`, global CSS, base layer,
theme tokens, Tailwind entry, dependencies, style, base, iconLibrary, component
files, and registry items. ahtml injects the renderer app, sanitized document,
capability data, diagnostics, and build wiring into that runtime; it does not
own a parallel shadcn UI kit or pseudo template.

The registry should reserve a `base` / `radix` distinction, but the first pass
may implement the current managed runtime's radix path. If the runtime base is
unsupported, doctor should report that clearly.

### Interaction and fallback

Tabs and accordion should keep real interaction in the artifact. If JavaScript
is unavailable, content must remain present and readable; no-JS mode does not
need to preserve the interaction itself.

### Acceptance level

Start at acceptance level B: final HTML must contain real shadcn/native
structure. `data-agent-html-component` markers alone are not enough.

## 通俗版 Checkpoints

现在的问题可以先理解成一句话：菜单上写了很多菜，但厨房现在只会稳定做一两道。

这里的“菜单”就是 `ahtml schema --format prompt`，agent 会根据它写
`.agent.html`。“厨房”就是 ahtml runtime 里的 renderer。现在 agent 点菜没有
大问题，验单也能通过，但厨房还没有一套通用做菜规则，所以很多菜最后被端成了
普通 section。

### 1. 先把原材料拿到 ahtml 自己的厨房里

shadcn 是原材料仓库。用户自己的项目里装了 shadcn，不代表 ahtml 的 managed
runtime 也能直接用。

现在的难点是：用户会以为“我本地已经装了全套 shadcn，所以 ahtml 应该能渲染
全套组件”。但 ahtml 实际上有自己的 runtime，不能默认读取用户项目里的组件。

这个 checkpoint 完成时，我们应该能清楚看到：ahtml 自己的 runtime 里到底装了
哪些 shadcn 文件，这些文件是不是 ahtml renderer 真的会用。

> shadcn note: `npx shadcn@latest info` 已经能给出 `base`、`style`、
> aliases、resolved paths、Tailwind 文件和组件目录；`add --dry-run` 能预览
> 会写入哪些文件。这些可以作为 ahtml managed runtime 的检查输入，但不能把
> 用户项目里的 shadcn 安装状态当成 ahtml renderer 支持证据。

### 2. 看懂 shadcn 组件盒子里有什么

拿到 shadcn 源码后，ahtml 要先看懂里面有哪些东西：导出了哪些组件、有哪些
slot、有哪些 variant、依赖哪些文件。

难点是：shadcn / React props 太自由，不能一股脑给 agent。比如 `className`、
`style`、事件、`asChild` 这些都不能变成 agent-facing 协议。

这个 checkpoint 完成时，ahtml 能抽出安全的 ui / slot 信息，同时不把实现细节
暴露给 agent。

> shadcn note: `npx shadcn@latest view @shadcn/<component>` 和组件 docs 能提供
> registry item、文件内容、exports、`data-slot`、dependencies 和示例。它们适合
> 生成 capability 草稿；最终 safe props 和 agent-facing 名称仍必须由 ahtml
> overlay 收束。

### 3. 把能力做成 agent 能看的菜单

schema 是给 agent 看的菜单。它应该告诉 agent：你能写什么、哪些参数能选、哪些
结构是合法的。

现在的问题是：菜单比厨房能力大。schema 里告诉 agent 可以写 `tabs`、
`accordion`、`table`、`list`，但 renderer 还不能忠实渲染它们。

这个 checkpoint 完成时，默认菜单上只会出现厨房真的能做的东西；如果某个能力还
只是计划中，只能在 JSON schema 或 doctor 里诚实显示状态，不能诱导 agent 默认
使用。

> shadcn note: composition 文档已经给出很多稳定结构，比如 Card full
> composition、TabsTrigger 必须在 TabsList 里、Alert 使用 Title /
> Description。这些规则可以变成 slot schema；但 shadcn docs 是 React 用法文档，
> 不能直接发布成 agent-facing prompt schema。

### 4. agent 写 agent.html

这一步现在相对不是主要问题。agent 能根据 schema 写出合法的 `.agent.html`。
下一步正式协议会收敛到 `<ui>` / `<slot>`，而不是继续扩大一组手写语义标签。

真正的问题是：写得合法，不等于最后渲染正确。

这个 checkpoint 完成时，凡是 prompt schema 允许 agent 写的例子，都应该同时有
明确的 renderer 支持。

> shadcn note: shadcn examples 可以作为“正确组合长什么样”的参考，例如 Tabs
> 由 Tabs、TabsList、TabsTrigger、TabsContent 组成。但 agent 不应该直接写这些
> React 组件、shadcn props、Radix props 或 Tailwind classes。

### 5. 检查和清洗 agent.html

validate / sanitize 就像验单：检查 agent 有没有写未知组件、非法参数、错误的
父子结构，顺便挡住危险内容。

现在它能检查“写法是否合法”，但还没有充分检查“后面的厨房能不能真的做出来”。

这个 checkpoint 完成时，如果某个结构合法但 renderer 做不出来，应该在
validate、build 或 doctor 阶段给出清楚诊断，而不是最后默默降级成普通 section。

> shadcn note: shadcn 的结构规则可以直接变成 validation 规则，例如
> TabsTrigger inside TabsList、SelectItem inside SelectGroup、Dialog/Sheet/Drawer
> 必须有 Title、Avatar 必须有 Fallback。ahtml 仍要额外检查 renderer capability，
> 因为“shadcn 结构合法”不等于“ahtml runtime 能渲染”。

### 6. 建一张通用菜谱

这是当前最大缺口之一。ahtml 需要一张通用 registry，记录每个可渲染组件怎么从
agent-html 对应到 shadcn/native 组件。

比如 `tabs` 应该知道：根组件是谁、有哪些 slot、哪个 slot 对应哪个 shadcn
export、哪些 props 可以安全传过去、需要安装哪些 shadcn 文件，以及当前 runtime
是 radix 还是 base。

难点是：这张菜谱必须是通用的，不能变成“tabs 写一份、accordion 写一份、table
再写一份”的手搓适配集合。

这个 checkpoint 完成时，registry 会记录 root export、slots、prop mapping、
runtime requirements 和 base/radix support status。

> shadcn note: `info` 里的 `base` 字段很关键，因为 radix 和 base 的 props
> 形状不同；例如 Accordion、ToggleGroup、Slider 的 `defaultValue` / `type` /
> `multiple` 规则都不同。这个差异应该进入 UiRegistry 的 safe prop mapping，而
> 不是交给 agent 自己判断。

### 7. 建一个通用翻译器

resolver 就是通用翻译器。它负责把检查后的 `.agent.html` 递归翻译成真正的
shadcn/native React 结构。

现在 runtime 基本只特殊处理了 `page` 和 `card`。其他组件多数走 generic
section，所以用户看到的不是 shadcn tabs / accordion。

难点是：resolver 要靠 registry 数据工作，而不是靠一堆 `if tabs then ...` 的
逐组件手写逻辑。

这个 checkpoint 完成时，`card`、`tabs`、`accordion`、`table`、`list` 都应该走
同一套通用 resolver 模型。

> shadcn note: shadcn docs/examples 提供目标 React composition，但不提供
> “把 `.agent.html` 翻译成 React composition”的机制。这个 resolver 是 ahtml
> 必须自建的产品层；shadcn 只能提供 registry、source 和正确组合参考。

### 8. 真的渲染成 shadcn/native 组件

这一步是用户最直观看到的结果。现在 `card` 能到 shadcn，但 `tabs`、
`accordion`、`list`、`table`、controls 大多还没有真正进入 shadcn/native
结构。

难点是：最终 HTML 不能只是挂一个 `data-agent-html-component="tabs"`，它必须
真的保留 tabs、accordion、table、list 这些阅读或交互语义。

这个 checkpoint 完成时，最终 HTML 里能看到真实的 tabs trigger/content、
accordion trigger/content、table、ul/ol 等结构；仅有
`data-agent-html-component` 标记不算完成。

> shadcn note: component docs、examples 和底层 Radix API 链接可以作为 output
> oracle：最终渲染结果应该能对应到这些组件的真实结构和交互语义。仅保留
> `data-agent-html-component="tabs"` 不算完成 shadcn/native render。

### 9. 生成可以分享的 artifact

artifact 是最后端给用户的成品。ahtml 的目标不是让用户看 dev server，而是拿到
可打开、可分享、可归档的静态 HTML artifact。

现在 artifact 流程存在，但如果组件已经在 renderer 阶段降级，最终 artifact
也只能拿到降级结果。

这个 checkpoint 完成时，preview 和 final build 应该走同一条 renderer 路径，
最终 artifact 能忠实表达 agent 写下的语义结构。tabs / accordion 在有 JS 时
保持真实交互；无 JS 时内容仍然存在且可读。

> shadcn note: shadcn 负责组件源码、preset 和样式材料，不负责 portable artifact
> 边界。静态分享、preview/build 一致性、资源路径和安全输出仍然是 ahtml 的责任。

### 10. 用 doctor 和 tests 防止再次跑偏

doctor / tests 是质检。现在它们更多证明 runtime 存在、Card 能跑，但还不能证明
“schema 里暴露的所有组件都能真实渲染”。

难点是：以后只要 schema 新增一个组件，如果 renderer 没跟上，就会再次出现
“菜单变大，厨房没变”的问题。

这个 checkpoint 完成时，只要 schema、runtime 文件、registry 或 resolver 不
一致，doctor 和 tests 就应该失败。

> shadcn note: shadcn CLI facts 可以作为 doctor 的输入，例如 installed
> components、resolved paths、base/style、docs/source availability。但 schema
> / registry / resolver parity 是 ahtml 自己的 contract，必须由 ahtml tests
> 和 doctor 负责。

最重要的结论：现在不是 agent 写错了，也不是用户没装 shadcn。真正缺的是一套
通用翻译器，把合法的 `.agent.html` 稳定翻译成真正的 shadcn/native 组件。

## Construction Status

### shadcn template / registry

Status: Misaligned.

Target: provide the complete runtime UI surface from shadcn template / init /
registry: `components.json`, component files, CSS entry, global CSS, base
layer, theme tokens, Tailwind entry, dependencies, aliases, style, base,
iconLibrary, docs, and registry metadata.

Current code: `shadcn` catalog and preset APIs are used during setup;
package-local runtime-template includes first-pass shadcn UI files and a
hand-maintained CSS surface.

Primary gap: runtime bootstrap still treats ahtml-owned template files as part
of the UI base. It must instead create or repair a shadcn-native managed
runtime, then inject only ahtml renderer/data/build glue. Registry facts still
do not automatically become executable ui/slot capability data.

### Generic capability extraction

Status: Partial.

Target: extract exports, `data-slot`, safe props, variants, and dependencies
into ui/slot facts.

Current code: generated introspection knows about components such as `tabs`,
`accordion`, `table`, `alert`, and `badge`; `src/config/render-capabilities.mjs`
records first-pass runtime requirements.

Primary gap: capability data is still curated constants plus overlays, not
generated ui/slot facts.

### Safe prompt schema

Status: Mostly aligned.

Target: show only renderable ui/slot capabilities as normal agent-facing
choices.

Current code: prompt schema now teaches preferred generic `<ui>` / `<slot>`
syntax first, then lists semantic compatibility tags; removed custom controls
are rejected. Tests keep validator generic slot names aligned with generated
ui capability slot names.

Primary gap: the JSON schema now includes first ui/slot capability objects, but
the core engine still validates semantic component schemas after normalizing
generic syntax.

### Agent authoring

Status: Transitional.

Target: agent writes generic `<ui>` / `<slot>` `.agent.html` from the prompt
schema.

Current code: validator accepts current semantic syntax for first-pass
components, rejects removed custom controls, rejects unknown generic slot names,
and normalizes a first `<ui>` / `<slot>` subset into the internal renderer
model.

Primary gap: prompt and JSON schema expose ui/slot capability, but validation
still normalizes into the existing semantic component model.

### Generic renderer registry

Status: Partial.

Target: register renderable ui components, slots, exports, safe prop mappings,
and requirements.

Current code: runtime has a centralized renderer registry in `app.tsx` with
render kinds, component renderers, and public slot-to-internal-child mappings.
Shared config separates shadcn runtime components from agent components and
records each component's render kind. Managed runtime setup writes
`render-capabilities.generated.json`, and the renderer checks component names,
render kinds, and handled slot names against that descriptor before rendering.

Primary gap: renderer entries are now generic by render kind for the first-pass
set, but renderer entry data still lives in runtime TypeScript instead of being
generated from the shared capability source.

### Generic renderer resolver

Status: Partial.

Target: recursively resolve sanitized agent-html to shadcn/native React
composition.

Current code: first-pass components route through the centralized registry;
slot child selection now goes through registry slot metadata instead of direct
per-renderer child-name literals. Simple primitive components such as `badge`
and `separator` now use a generic primitive renderer entry, title/content
components such as `card` and `alert` use a generic compound renderer entry,
`list` uses a generic collection renderer entry, `table` uses a generic table
renderer entry, `accordion` uses a generic interactive collection entry, `tabs`
uses a generic tabs entry, and `page` uses a generic compound shell entry
instead of bespoke component render functions. The renderer fails on
unsupported component names instead of falling back to a generic section. A
first sanitizer bridge can normalize `<ui>` / `<slot>` tabs, table, list,
accordion, and simple component nodes into the current renderer model, and it
now diagnoses unknown generic slots instead of flattening them silently.

Primary gap: unsupported renderer diagnostics are fail-fast runtime errors, not
yet structured validation diagnostics, and renderer entry data still lives in
the runtime TypeScript source instead of being generated from the shared
capability source.

### shadcn/native render

Status: First pass.

Target: render first-pass shadcn/native components with stable style and real
semantics.

Current code: `card`, `tabs`, `accordion`, `alert`, `badge`, `separator`,
`table`, and native `list` render as real structures.

Primary gap: full ui/slot model and broader component expansion remain pending.

### Runtime setup

Status: Misaligned.

Target: initialize and repair a shadcn-native managed runtime, then install the
shadcn registry items required by the generic renderer registry.

Current code: required runtime components are centralized and written to
`installedUiComponents`; manifest also records `renderableAgentComponents`.
The setup path still depends on package-local runtime-template files and has
shown that a partial CSS/base surface can make shadcn DOM render with incorrect
visual semantics.

Primary gap: manifest/runtime drift checks now include expected exports,
runtime base, schema/renderer component parity, and schema/runtime capability
parity, but do not yet prove the runtime was created from complete shadcn
template/init/registry surface or that built CSS contains the required shadcn
base layer. They also do not yet prove the renderer source itself was generated
from the same capability source.

### status / doctor

Status: Partial.

Target: report whether schema, runtime files, and generic renderer capability
are aligned.

Current code: status reports installed UI components and renderable agent
components; doctor checks required shadcn component files and named exports.

Primary gap: doctor verifies the current radix base, schema/renderer component
parity, and schema/runtime capability parity. Runtime also consumes render
capabilities and checks slot parity during render, but doctor does not yet
fully verify shadcn-native surface completeness: `components.json`, CSS entry,
global CSS/base layer, Tailwind entry, style/base/iconLibrary, dependencies,
registry item ids, and built CSS base effects. Slot mapping itself is not yet
fully data-driven.

### Tests

Status: First pass.

Target: prove the full chain from schema to built artifact.

Current code: focused tests cover schema removal, sanitize rejection, runtime
manifest separation, built artifact slots for semantic syntax, and a full
`<ui>` / `<slot>` prompt-to-artifact build path for tabs / accordion / table.
Those build tests execute the runtime component / slot parity assertion, and a
negative test now proves slot capability drift fails the build with a clear
slot mismatch.

Primary gap: tests now cover schema/runtime capability drift, render-kind drift,
validator slot drift, and runtime slot-capability drift, but not full
renderer-source generation from the same capability source.

## Core Breakpoints

- The schema is no longer ahead of the first-pass renderer for the current
  component set, and prompt output now puts `<ui>` / `<slot>` first. The JSON
  schema has first-class ui/slot capability objects, while the engine still
  uses semantic components as its internal normalized model.
- The removed ahtml custom controls are out of public schema and examples, and
  sanitizer tests reject them.
- Installing shadcn components is not the same as rendering agent-html with
  shadcn components.
- Installing shadcn registry items is also not the same as owning a complete
  shadcn runtime surface. The visual bug exposed that component DOM can exist
  while shadcn base CSS is incomplete.
- The next architecture fix is to remove package-local shadcn UI kit/CSS/pseudo
  template from the main path and rebuild managed runtime procurement around
  shadcn template / init / registry.
- The generic registry / resolver layer is the missing product layer. It must
  translate semantic agent-html into legal shadcn/native React composition
  without one-off adapters for each shadcn component.
- Generic fallback is no longer the renderer path for unsupported component
  names; diagnostics still need to become structured before SSR/runtime failure.
- Generic `<slot>` names now get validation diagnostics; unknown slots are no
  longer silently flattened into allowed text or children.
- `status`, `doctor`, and tests now cover the first-pass runtime files and
  artifact structure. Build-time runtime checks now compare component and slot
  parity, slot child selection is registry-guided, simple primitives can render
  through generic primitive entries, title/content components can render through
  generic compound entries, and lists can render through generic collection
  entries. Tables can render through generic table entries, accordions can
  render through generic interactive collection entries, tabs can render through
  generic tabs entries, and page shells can render through generic compound
  entries. The remaining gap is generated capability source ownership, not
  per-component render functions for the first-pass set.

## Fixed-State Criteria

- `ahtml schema --format prompt` exposes only renderable first-pass components:
  `card`, `tabs`, `accordion`, `alert`, `badge`, `separator`, `table`, and
  `list`.
- `choice-group`, `slider-control`, `feedback-box`, and `progress-meter` are
  removed from public schema, prompt output, docs, examples, and tests.
- Exposed components use the generic `<ui>` / `<slot>` capability model and a
  common registry / resolver path instead of component-specific handwritten
  adapters for the first-pass renderable set.
- `ahtml build` produces real component semantics for representative artifacts:
  tabs render as tabs, accordion items render as triggers and content, lists
  render as `ul` or `ol`, and tables render as tables.
- Tabs and accordion keep real interaction when JS is available; their content
  remains present and readable when JS is unavailable.
- `doctor` fails when required renderer shadcn components are missing.
- Runtime manifest separates installed shadcn components from rendered
  agent-html components.
- Runtime setup creates or repairs a shadcn-native managed runtime rather than
  relying on package-local shadcn component copies or hand-written CSS.
- `doctor` fails when the shadcn runtime surface is incomplete, including
  missing CSS entry, missing base layer, missing `components.json`, unsupported
  base/style/iconLibrary, missing registry items, or missing required exports.
- Sanitizer has a first bridge from generic `<ui>` / `<slot>` syntax into the
  current internal renderer model, but this is not yet the default prompt
  schema.
- The Einstein-style artifact no longer degrades into a tree of generic
  `ahtml-section` nodes.
- Tests enforce schema/render parity so future schema additions cannot ship
  without renderer support.
