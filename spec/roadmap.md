# agent-html Roadmap

本轮目标：把新蓝图彻底下推到 spec，并让后续实现围绕“语义组件 + presentation
profile”收敛，而不是继续扩张旧协议或旧配置口径。

```txt
semantic component contract
  + presentation profile registry
  -> sanitized semantic document
  -> renderer mapping
  -> shadcn/native artifact
```

## Phase 1: Lock The Public Contract

- 对外 authoring contract 只保留语义组件和 profile 选择。
- 不再把 `<ui>` / `<slot>` 描述成正式主协议。
- 不再把 runtime capability metadata 描述成 agent-facing schema 来源。
- 移除的自定义控件不回到 schema，除非通过真实语义合同和 renderer support 重新接入。

Current state:

- 已完成一部分。语义组件已经是当前 validator / schema 的主要公开表面。
- 已完成一部分。blueprint 已切换到 semantic component contract +
  presentation profile 口径。
- 已完成一部分。旧 `<ui>` / `<slot>` authoring path 已从默认公开实现路径移除。

Done when:

- spec、blueprint、后续实现任务都把“语义组件 + profile”当作唯一公开目标。

## Phase 2: Move Visual Choice Under Presentation Profiles

- presentation profile 成为默认公开视觉选择面。
- `RenderConfig` 的长期目标是 profile-first，而不是 `theme` / `density` / `tone` /
  `width` 这种平铺参数包。
- 只有极少量与 profile 绑定的受控 token 才能保留。

Current state:

- 已完成一部分。blueprint 已把 `PresentationProfile`、`PresentationProfileRegistry`
  和 profile-first `RenderConfig` 定义为目标。
- 已完成一部分。当前实现里的 `RenderConfigSchema` 已切到 profile-only 公共输入，
  旧 finite header 输入已不再接受。

Done when:

- spec 明确把现有 render config 视为迁移现实，而不是最终架构。

## Phase 3: Keep Shadcn Internal And Runtime-Native

- runtime 初始化必须走 shadcn template / init / registry。
- shadcn 负责 `components.json`、CSS、base layer、Tailwind entry、依赖、组件源码、
  style、base、iconLibrary。
- ahtml 只注入 renderer app、sanitized document、verification data、
  diagnostics、build / preview wiring。
- 不把 shadcn props、variant、source structure 提升为 agent-facing 合同。

Current state:

- 已实现一部分。`status` / `doctor` 已经会检查 `components.json` 语义、CSS entry、
  required imports、base surface、manifest surface 和 runtime provenance。
- 已实现一部分。setup 现在会调用 `shadcn init/add`，但 runtime shell 仍通过本地
  checked-in template mirror 引导。
- 仍未完成。runtime source ownership 还是 partial，不是完全 shadcn-native。

Done when:

- runtime source of truth 完全收敛到 shadcn template / init / registry，而不是
  ahtml-owned UI base。

## Phase 4: Convert Capability Extraction Into Verification Only

- generated introspection、render-capabilities、renderer mapping、slot metadata
  只做内部 verification、drift check 和 renderer input。
- 不再把它们描述成“对外 schema 主路径”。
- contract/runtime/renderer parity 成为这些数据的核心职责。

Current state:

- 已实现一部分。运行时已经生成并校验 `render-capabilities.generated.json`，doctor、
  build、runtime parity checks 也已接入。
- 已实现一部分。generated introspection 和 shared capability metadata 已经在内部
  驱动部分 renderer / parity 工作。
- 已实现一部分。外部话术已经收口到 verification / mapping 语义，剩余工作主要是
  内部命名和 runtime 所有权继续收口。

Done when:

- capability extraction 在 spec 和实现语言里都被清晰定义为 internal verification
  infrastructure。

## Phase 5: Finish Semantic-To-Runtime Mapping

- renderer 围绕语义节点、approved profile、safe mapping、runtime requirements
  工作。
- 不为单个 shadcn 组件新增手写 adapter，除非明确记录为临时例外。
- legacy `<ui>` / `<slot>` 只作为兼容层，直到可删除。

Current state:

- 已实现一部分。`card`、`tabs`、`accordion`、`alert`、`badge`、`separator`、
  `table`、`list` 已能走到真实结构。
- 已实现一部分。shared renderer kind、renderer mapping、slot metadata、runtime
  registry parity 已接到 build / doctor / tests。
- 仍未完成。resolver 行为仍有一部分手写 TypeScript 逻辑，runtime source ownership
  也还没有彻底收束。

Done when:

- renderer 主路径被描述并实现为“语义节点到内部 UI 的映射链”，不再依赖旧协议叙事。

## Phase 6: Prove The Contract End To End

- build / preview 使用同一 renderer path。
- 样例 artifact 必须有真实 shadcn/native DOM、完整 shadcn CSS、正确视觉。
- tabs / accordion 保持真实交互；无 JS 时内容仍可读。
- static artifact 仍是默认交付形态。
- doctor / tests 同时卡住 contract、profile、runtime surface、renderer parity。

Current state:

- 已实现一部分。tabs 和 accordion 现在都会在 artifact 里输出 `noscript`
  fallback section，保证无 JS 时内容仍然可读。
- 已实现一部分。runtime completeness、renderer parity、runtime drift、artifact
  structure 都已有对应 tests。
- 已实现一部分。tests 已经围绕 profile-first 合同、verification data、renderer
  mapping 运行；剩余工作更偏向 runtime ownership 和覆盖面扩展。

Done when:

- 从公开合同到 artifact 的整条链都按新蓝图语言描述并被 tests 保护。

## Phase 7: Expand Without Reintroducing The Old Design

- 新组件只通过语义合同、profile 兼容性、runtime verification、doctor checks、
  artifact tests 接入。
- button、toggle group、slider、textarea、progress、checkbox、forms 等未来能力
  必须作为真实语义能力返回，而不是直接暴露底层 shadcn 细节。
- 不重新长出第二套 ahtml UI framework，也不重新长出第二套对外 runtime 协议。

Done when:

- 扩展组件目录不会重新把 agent-facing 合同拖回 runtime-first 思路。
