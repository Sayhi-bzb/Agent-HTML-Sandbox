# renderer to portable output Contract

本文规定 renderer 到 portable output 的边界。

## Provider

renderer 提供已渲染 artifact。

## Consumer

portable output 层生成可打开、可分享、可归档的交付物。

## Rules

- artifact 优先面向静态分享。
- dev preview 不作为最终交付形态。
- portable output 不得绕过 parse / sanitize。
- portable output 默认不依赖不透明外部资源。
- 交付物应保留 artifact 的可检查性。

## Forbidden

- 把 Vite preview 当作唯一交付形态。
- 在输出阶段重新引入未检查脚本。
- 让交付物隐式依赖难以迁移的运行环境。
