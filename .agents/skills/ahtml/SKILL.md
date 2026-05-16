---
name: ahtml
description: Use `ahtml` when a semantic `.agent.html` document should be rendered as an HTML artifact. It fits outputs that need more structure or reviewability than Markdown.
---

# ahtml

Use `ahtml` to turn semantic `.agent.html` into an HTML artifact.

## Commands

```bash
ahtml prompt
ahtml build artifact.agent.html
ahtml preview artifact.agent.html
ahtml inspect --input artifact.agent.html
```

## Syntax

Header:

```html
<meta-agent profile="report-default|ops-compact|review-dense" />
```

Required root:

```txt
page(title*) is required.
page contains top-level blocks: alert, card, separator, table, list, tabs, accordion.
```

Core blocks:

```txt
card(title?) is the main content container.
alert(title? tone?=neutral|danger) -> text
badge(tone?=neutral|success|warning|danger) -> text
progress(value*) -> none
separator -> none
```

Structured blocks:

```txt
list(variant?=ordered|unordered) -> item -> text
table -> row(kind?=header|body) -> cell -> text
tabs(default?) -> tab(value* label*)
accordion -> accordion-item(value* title*)
```

Field and option blocks:

```txt
input(label* value? description?)
textarea(label* value? description?)
checkbox(label* checked?=true|false description?)
switch(label* checked?=true|false description?)
slider(label* value* description?)
radio-group(label* value? description?) -> option(value* label*) -> text
toggle-group(label* value? description?) -> option(value* label*) -> text
select(label* value? description?) -> option(value* label*) -> text
combobox(label* value? description?) -> option(value* label*) -> text
```

Content rule:

```txt
Cards, tabs, and accordion items hold standard content blocks and field/option blocks.
`text` means plain text content, not a <text> tag.
Write text directly inside the allowed parent element.
Do not put bare text directly inside <tab>; wrap tab content in a content block.
```

Semantic-only boundary:

```txt
Do not use class, className, style, Tailwind classes, scripts, event handlers,
shadcn props, Radix props, arbitrary HTML attributes, raw HTML passthrough,
unknown tags, or unknown attrs.
```

If a nesting or attr detail is unclear, run `ahtml prompt` or read `references/usage.md`.

## Route

- Install, runtime setup, repair, isolated runtime -> `references/install.md`
- Command flow, writing, build, preview, inspect -> `references/usage.md`
- Build, preview, runtime, or environment failures -> `references/debug.md`
- Reproducible bug reports -> `references/bug-reporting.md`
