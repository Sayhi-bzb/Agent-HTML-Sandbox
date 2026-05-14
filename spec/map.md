# agent-html Rendering Chain Map

This map tracks the construction state of the product chain from the public
authoring contract to the final HTML artifact. It exists to make the current
gap visible: blueprint has moved to a semantic component contract plus
presentation profile model, while parts of the implementation still carry older
compatibility shapes and runtime debt.

Blueprint is the target architecture authority. This file is the current
construction map: it records where implementation has caught up with the
blueprint and where the chain is still incomplete.

## Chain Comparison

Target chain:

```txt
semantic component contract
  + presentation profile registry
  -> agent writes semantic .agent.html
  -> parse / validate / sanitize
  -> SanitizedAgentHtml + approved RenderConfig
  -> renderer adapter maps semantic nodes to internal UI
  -> shadcn/native render
  -> portable HTML artifact
```

Internal verification chain:

```txt
shadcn template / init / registry
  -> shadcn-native managed runtime surface
  -> runtime capability facts
  -> contract verification + renderer registry inputs
  -> drift checks
```

Current chain:

```txt
profile-first render config + semantic component schema
  -> agent writes valid .agent.html
  -> parse / validate / sanitize
  -> runtime renderer uses shared verification data and renderer mapping
  -> first-pass shadcn/native components render as real structures
  -> portable HTML artifact with first-pass coverage
```

Current architecture gap: the renderer pipeline already reaches real first-pass
components, and the public contract is now profile-first and semantic. The
remaining gaps are now concentrated in runtime procurement, broader component
coverage, and some internal naming / ownership debt. The desired base is semantic
components plus named presentation profiles on the public side, and
shadcn-native template/init/registry plus internal capability verification on
the runtime side.

## Final Decisions

These decisions are locked for the next implementation pass.

### Agent-facing authoring

The public authoring contract is semantic agent-html, not generic runtime
protocol shapes.

Target example:

```html
<meta-agent profile="ops-compact" />
<page title="Weekly review">
  <card title="Service status" status="healthy">
    All core checks passed.
  </card>
</page>
```

Semantic convenience tags such as `<card>`, `<tabs>`, and `<table>` are the
public authoring surface. The old generic `<ui>` / `<slot>` authoring path has
been removed from the default implementation path and must not return as a
parallel public protocol.

### Presentation profiles

Visual choice belongs to named presentation profiles.

The target public choice is a profile id such as `ops-compact` or
`review-dense`. Internal profile tokens may still bind things such as theme,
density, card treatment, table treatment, badge treatment, emphasis, and
width, but those implementation details should not remain the default
agent-facing prop bag.

Current finite `theme` / `density` / `tone` / `width` config should be treated
as an internal resolved token shape, not the public authoring surface.

### Honest schema

Schema must only advertise components and profile choices that the renderer can
actually support.

JSON schema and doctor may still show internal capability state, planned
components, unsupported components, or runtime verification data, but those
must not be advertised as normal agent-facing choices.

Build and validate must not silently turn registered-but-unrenderable
components into generic fallback output. They should produce clear diagnostics.

### Runtime boundary

ahtml uses its own managed runtime. A user's project-local shadcn install is
not evidence of ahtml render support.

That managed runtime must be created from shadcn template / init / registry.
shadcn is the source of truth for `components.json`, global CSS, base layer,
theme tokens, Tailwind entry, dependencies, style, base, iconLibrary, component
files, and registry items. ahtml injects the renderer app, sanitized document,
verification data, diagnostics, and build wiring into that runtime; it does
not own a parallel shadcn UI kit or pseudo template.

### Internal capability verification

Generated introspection, renderer mapping data, render-capabilities, slot metadata, and
similar shared runtime facts are internal verification machinery.

They exist to prove contract/runtime/renderer parity, support drift checks, and
drive internal mapping. They are not the public authoring contract, and they
must not be treated as the product's primary external protocol.

### Acceptance level

Start at acceptance level B: final HTML must contain real semantic or
shadcn/native structure. `data-agent-html-component` markers alone are not
enough.

## 通俗版 Checkpoints

现在的问题可以先理解成一句话：蓝图已经决定“agent 只写语义和 profile”，但现在
系统里还有一部分旧口径和兼容桥没清干净。

### 1. 先把 agent-facing 合同收紧

agent-facing 合同应该清楚告诉 agent 两件事：你能写哪些语义组件、你能选哪些
presentation profile。

现在的现实是：组件语义合同已经有了，但文档和实现里还残留旧的运行时导向说法，
比如 `<ui>` / `<slot>`、slot 能力、以及一组平铺的视觉配置枚举。

这个 checkpoint 完成时，默认对 agent 公开的就只剩“语义组件 + profile 选择”。

### 2. 把视觉选择折叠进 profile

用户真正想调的是整体呈现风格，而不是让 agent 逐个理解 `theme`、`density`、
`tone`、`width` 这些低层实现参数。

现在实现里 `RenderConfig` 还保留了这组有限枚举，所以它们暂时是兼容现实；但 spec
已经不能继续把它们描述成最终目标。

这个 checkpoint 完成时，spec 会明确：最终公共选择面是命名 profile，而不是视觉
参数包。

### 3. 把 shadcn 留在 runtime 内部

shadcn 是 runtime 的实现底座，不是 agent 的 authoring 语言。

现在的难点不是“有没有 shadcn”，而是“runtime 是否完整、renderer 是否真的能把
语义节点映射到内部 shadcn/native UI”。

这个 checkpoint 完成时，spec 会把 shadcn 写成内部实现和验证来源，而不是 agent
学习的公开协议。

### 4. 能力抽取只做内部校验

运行时里确实还需要 introspection、render-capabilities、renderer mapping、slot
metadata 这些东西，但它们的职责是内部校验和 drift check。

这个 checkpoint 完成时，spec 会明确：这些数据是“内部能力事实”，不再是“对外菜单”。

### 5. renderer 负责做真正翻译

agent 写的是语义结构，renderer 负责把这些语义节点翻成内部 UI。

现在第一批组件已经能走到真实结构，但 mapping 逻辑和一些 shared capability
metadata 还保留着旧时代痕迹。

这个 checkpoint 完成时，我们关心的是“语义节点能不能稳定映射到内部 UI”，而不再
是“agent 会不会写某种运行时协议”。

### 6. preview / build 要走同一条语义渲染链

最终目标仍然是静态 artifact，而不是 dev server 页面。

这个 checkpoint 完成时，preview 和 build 共用同一条语义渲染链，tabs /
accordion 等交互组件在有 JS 时保留交互，无 JS 时内容仍可读。

### 7. doctor / tests 防止再次跑偏

以后只要公开合同、profile、runtime surface、renderer mapping 这几层有一层不
一致，doctor 和 tests 就应该失败。

这个 checkpoint 完成时，系统能防住两类老问题：

- 菜单暴露得比 renderer 能力更大
- runtime 看起来“有 shadcn”，但实际上底座不完整

最重要的结论：现在不是继续扩张旧协议，也不是继续把 runtime 能力直接暴露给
agent。真正要完成的是一条从语义合同到内部 UI 的稳定映射链。

## Construction Status

### Agent-facing contract

Status: Transitional.

Target: expose semantic component contracts and named presentation profiles as
the only default public authoring surface.

Current code: semantic components are already the main validated authoring
shape, and public schema/prompt output now lead with named presentation
profiles. The old `<ui>` / `<slot>` authoring path and old finite config
header path are no longer accepted as normal public input.

Primary gap: the target contract has changed, but public-state descriptions and
some internal naming and runtime debt still reflect the older protocol/config
shape.

### Presentation profile layer

Status: First pass.

Target: `RenderConfig` should default to a named approved profile, with only a
small number of tightly controlled profile-bound tokens if truly needed.

Current code: public schema, docs, prompt output, and parser validation now use
named profiles. `RenderConfig` still resolves to internal `theme`, `density`,
`tone`, and `width` tokens after profile selection, but those are no longer a
public header contract.

Primary gap: profile selection is now public, but the internal resolved token
shape still needs to be fully treated as runtime-only implementation detail.

### shadcn-native managed runtime

Status: Misaligned.

Target: provide the complete runtime UI surface from shadcn template / init /
registry: `components.json`, component files, CSS entry, global CSS, base
layer, theme tokens, Tailwind entry, dependencies, aliases, style, base,
iconLibrary, docs, and registry metadata.

Current code: `shadcn` catalog and preset APIs are used during setup; ahtml now
generates its own minimal runtime shell, then calls `shadcn init/add`, and the
artifact path still carries an ahtml-managed CSS surface.

Primary gap: runtime bootstrap still treats ahtml-owned template files as part
of the UI base. It must instead create or repair a shadcn-native managed
runtime, then inject only ahtml renderer/data/build glue.

### Runtime capability verification

Status: Partial.

Target: generate and validate runtime capability facts that prove contract,
runtime surface, and renderer parity without becoming the public schema.

Current code: generated introspection knows about components such as `tabs`,
`accordion`, `table`, `alert`, and `badge`; `src/config/render-capabilities.mjs`
records first-pass runtime requirements; runtime bootstrap emits
`render-capabilities.generated.json`; build and doctor compare runtime
verification data and renderer mapping with schema expectations.

Primary gap: these runtime facts are useful and increasingly authoritative for
internal verification, but the implementation vocabulary still reflects the old
"capability schema first" story in places and has not yet been fully recast as
verification-only infrastructure.

### Parse / sanitize

Status: First pass.

Target: validate semantic components plus approved profile choice, then produce
`SanitizedAgentHtml` for the renderer.

Current code: parse/validate/sanitize now centers semantic components and
profile-first authoring only. Old `<ui>` / `<slot>` input and old finite render
config input are rejected instead of silently normalized.

Primary gap: sanitize is now aligned at the public boundary; remaining work is
mostly downstream runtime ownership and renderer breadth.

### Renderer mapping

Status: Partial.

Target: map sanitized semantic nodes to internal shadcn/native/composite UI
through shared registry/resolver machinery.

Current code: first-pass components route through a centralized renderer
registry; slot child selection now goes through registry metadata instead of
direct per-renderer literals. Simple primitives such as `badge` and
`separator`, title/content components such as `card` and `alert`, native `list`,
`table`, `accordion`, `tabs`, and `page` all render through shared render-kind
machinery instead of bespoke per-component render functions.

Primary gap: the direction is correct, but parts of the resolver behavior still
live in runtime TypeScript and still reflect legacy compatibility scaffolding.

### shadcn/native render

Status: First pass.

Target: render first-pass shadcn/native components with stable style and real
semantics.

Current code: `card`, `tabs`, `accordion`, `alert`, `badge`, `separator`,
`table`, and native `list` render as real structures.

Primary gap: broader component expansion and full contract/profile alignment
remain pending.

### status / doctor

Status: First pass.

Target: report whether public contract, runtime files, and internal verification
data are aligned.

Current code: status now treats runtime completeness as part of `ready` and
checks `components.json` semantics, CSS entry existence, required Tailwind /
shadcn imports, CSS base surface, manifest surface consistency, and recorded
runtime provenance metadata. doctor now checks those same surfaces, required
shadcn component files, named exports, schema/runtime capability parity,
schema/renderer mapping parity, renderer registry parity, recorded provenance
metadata, and built artifact CSS when an artifact exists.

Primary gap: doctor is already strong on runtime surface and parity checks, but
the public-side target has moved to profile-first authoring and the current
checks still speak more in capability/config terms than in final contract
terms.

### Tests

Status: First pass.

Target: prove the full chain from public contract to built artifact.

Current code: focused tests cover schema removal, sanitize rejection, runtime
manifest separation, built artifact slots for semantic syntax, and a full
prompt-to-artifact build path for first-pass interactive structures. Runtime
surface tests cover `components.json`, CSS imports, runtime completeness,
doctor output, and built CSS surface checks. Heavy CLI tests cover structured
runtime drift diagnostics and runtime repair flows.

Primary gap: tests already cover many internal parity checks, but they still
encode parts of the old config/protocol reality, including finite render config
fields and generic ui/slot compatibility paths.

## Core Breakpoints

- The target public contract is now semantic components plus named
  presentation profiles.
- The current implementation now exposes named profiles as the public
  authoring surface.
- Legacy `<ui>` / `<slot>` input and legacy finite render-config header input
  are no longer accepted on the public authoring path.
- Installing shadcn components is not the same as rendering agent-html with
  shadcn components.
- Installing shadcn registry items is also not the same as owning a complete
  shadcn runtime surface. The visual bug exposed that component DOM can exist
  while shadcn base CSS is incomplete.
- Runtime capability data, generated introspection, renderer mapping data, and slot
  metadata are internal verification assets. They should not remain the public
  story of the product.
- The generic registry / resolver layer remains the key product layer on the
  runtime side. It must map semantic agent-html into legal shadcn/native React
  composition without one-off adapters for each component.
- Generic fallback is no longer the renderer path for unsupported component
  names; build now emits structured runtime-render diagnostics before
  SSR/runtime failure.
- `status`, `doctor`, and tests now cover the first-pass runtime files,
  `components.json` semantics, CSS entry/import/base completeness, manifest
  surface consistency, provenance metadata, optional built CSS surface, and
  artifact structure. The remaining gaps are contract/profile migration and
  full shadcn-native runtime ownership.

## Fixed-State Criteria

- `ahtml schema --format prompt` exposes only renderable semantic components
  and approved presentation profile choices.
- Public authoring no longer depends on `<ui>` / `<slot>` as the target
  protocol.
- Public render config no longer defaults to `theme` / `density` / `tone` /
  `width` as the primary authoring surface; named profiles own visual choice.
- `choice-group`, `slider-control`, `feedback-box`, and `progress-meter` remain
  removed from public schema, prompt output, docs, examples, and tests until
  they return through the real semantic/runtime path.
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
- Tests enforce contract/runtime/renderer parity so future public contract
  changes cannot ship without renderer support.
