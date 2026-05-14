
## Q1

**Q：**

> 我在想，能不能这样，config可以打开装扮界面，user可以调节预设的ui组件风格，调整好后保存  
> 然后后面的各个组件可以直接安装预设的风格进行渲染，可以进一步降低一些props prompt  
> 你觉得如果这样的话，可以砍掉哪些prompt？还是说可以极端点让agent直接用shadcn ui预设组件拼积木？

**A：**

这个方向可行，而且很符合 agent-html 的架构边界：让用户调的是 `presentation profile`，agent 只写语义结构。

建议把用户装扮界面理解为配置有限 profile/token，而不是开放任意 CSS、Tailwind class 或 shadcn props。

例如 profile 可以包含：

```txt
theme: nova | vega
density: compact | comfortable
cardStyle: flat | outlined | elevated
tableStyle: simple | bordered | striped
emphasis: quiet | normal | strong
chartPalette: categorical | muted | contrast
```

这样 agent 只需要写：

```html
<meta-agent profile="team-report-compact" />

<card title="Q2 Risks">
  ...
</card>
```

renderer 根据 profile 决定具体 shadcn 组件风格。

可以砍掉的大多是视觉类 props：

```txt
variant
size
density
tone
color
accent
surface
elevation
radius
spacing
align
width
layoutStyle
tableVariant
chartPalette
badgeTone
cardVariant
```

应该保留的是语义类 props：

```txt
title
description
value
status
intent
priority
href
label
columns
rows
items
disabled
```

不建议让 agent 直接用 shadcn UI 预设组件拼积木作为主路径。那会泄漏 `CardHeader`、`TabsList`、`asChild`、`className`、Radix props 等实现细节，prompt 会重新变大。

更好的形态是：

```txt
agent-facing:
  语义积木

user/profile:
  装扮选择

renderer:
  内部用 shadcn 拼 UI
```

## Q2

**Q：**

> 我梳理一下我们的想法：  
> 建立一个config配置样式区  
> - 配置样式时直接定义组件UI的样式/风格等变量  
> - 降低agent prompt的面积，让agent专心拼积木  
> - 样式有对应的name，这样每次不用meta了，只需要在header声明样式预设  
> 我说的对吗

**A：**

大方向是对的，但需要收紧表述。

更准确的版本是：

```txt
建立一个用户级 presentation profile 配置区
- 用户在配置/装扮界面里选择有限的主题、密度、组件风格、布局倾向等 token
- 每组配置保存成一个有 name 的 profile
- agent 在 .agent.html header 里只声明 profile name
- agent prompt 里减少视觉 props，让 agent 专心表达结构、内容、状态和关系
- renderer 根据 profile 把语义组件映射到具体 shadcn UI 组合和样式
```

需要注意两点：

第一，不是开放任意组件 UI 变量。  
应该开放受控 token，例如：

```txt
profile: ops-compact
theme: nova
density: compact
cardTreatment: outlined
tableTreatment: striped
badgeTreatment: subtle
emphasis: quiet
width: dashboard
```

不应该开放：

```txt
Card.className = "..."
Button.variant = "..."
--primary = "..."
```

第二，不是完全不用 header，而是 header 变薄。  
例如从：

```html
<meta-agent theme="neutral" density="compact" tone="dashboard" width="wide" />
```

变成：

```html
<meta-agent profile="ops-compact" />
```

结论：你的理解是对的，但核心边界是 **profile name + 有限 token**，不是任意样式配置。

## Q3

**Q：**

> 这样是不是也可以降低开发解析难度？毕竟直接预设了

**A：**

是的，会明显降低开发解析难度。

降低的是：不再需要从 shadcn 源码里推断那么多公开 props / variants / styling API。

原来如果要通用解析 shadcn，可能要处理：

```txt
Button.variant
Button.size
Badge.variant
Card className
Table styling
Alert variant
Tabs composition
cva variants
Radix props
DOM props
```

有 profile 后，解析器不需要把这些都变成 agent-facing prompt schema。它只需要回答：

```txt
这个组件是否存在？
需要哪些 shadcn registry items？
需要哪些 exports？
有哪些稳定 slots / subcomponents？
renderer 能不能把语义节点映射过去？
哪些 props 必须禁止？
```

例如 `Button`：

没有 profile 时，可能要暴露：

```txt
variant: default | outline | ghost | destructive | secondary
size: default | sm | lg | icon
disabled: boolean
type: button | submit | reset
```

有 profile 后，可以变成：

```txt
<action intent="primary|secondary|danger" disabled?>
```

然后 profile 决定：

```txt
primary -> Button variant default
secondary -> Button variant outline
danger -> Button variant destructive
compact -> size sm
comfortable -> size default
```

所以更准确地说：

```txt
预设 profile 不能替代 shadcn capability parsing，
但可以把解析目标从“公开完整组件 API”
降级成“验证 runtime 能力 + 支撑内部 renderer 映射”。
```

## Q4

**Q：**

> 我是不是理解原本的方案只能实现半自动化，现在的方案可以实现更高的自动化？

**A：**

对，这个理解基本准确。

原本方案是：

```txt
shadcn 源码 / .d.ts / registry
  -> 自动抽取 props / variants / slots
  -> overlay 决定哪些暴露给 agent
  -> prompt schema
```

它只能半自动化，因为“哪些 shadcn props 适合 agent 用”很难自动判断。

例如这些问题都需要人工产品判断：

```txt
variant="outline" 是否该暴露？
size="icon" 是否该暴露？
asChild 是否禁止？
CardHeader 是否让 agent 写？
Alert variant 是视觉还是语义？
```

新方案是：

```txt
shadcn runtime + preset profile
  -> 自动确认组件能力
  -> renderer 内部映射语义组件
  -> agent prompt 只暴露语义积木
```

自动化程度更高，因为公开面更小、更稳定。很多原来需要人工判断的 shadcn props，直接不进入 agent contract。

但仍然不是 100% 自动化。还需要人工定义：

```txt
有哪些语义组件
每个语义组件有哪些语义 props
profile token 有哪些
semantic prop 到 shadcn implementation 的映射规则
哪些组件属于稳定 public contract
```

最终结论：

```txt
原方案：自动生成 shadcn API draft + 人工收束，半自动。
新方案：人工定义语义层 + profile 固化视觉层，
        shadcn 解析主要做能力校验和内部映射，自动化程度更高。
```

更重要的是，新方案风险更低：即使 shadcn 的具体 props 或源码细节变化，只要 profile resolver 和 required exports 还能工作，agent-facing schema 不一定要变。