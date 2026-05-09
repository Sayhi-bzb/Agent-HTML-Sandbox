# renderer to portable output Contract

本文规定 renderer 到 React / HTML / portable output 的边界。

## Provider

renderer 提供 React output 和 HTML output。

## Consumer

portable output 层消费 renderer 产物，并生成可打开、可分享、可归档的交付物。

## Rules

- renderer output 必须来自已检查的 SanitizedAgentHtml。
- React output 使用内部标准组件实现。
- HTML output 是标准组件渲染后的可检查底层 HTML。
- 默认交付物是 static artifact directory。
- static artifact directory 必须包含 `index.html`、CSS / JS bundle 和声明过的 assets。
- dev preview 和 final artifact 必须共用同一 renderer、ComponentSchema、RenderConfig 和样式系统。
- dev preview 与 final artifact 的视觉目标一致。
- 允许视觉差异只能来自 viewport / container、字体 / 网络资源策略、asset path、dev-only tooling 和显式 single-file mode。
- artifact 优先面向静态分享。
- dev preview 不作为最终交付形态。
- portable output 不得绕过 parse / sanitize。
- portable output 默认不依赖不透明外部资源。
- 交付物应保留 artifact 的可检查性。

## Forbidden

- 把 Vite preview 当作唯一交付形态。
- 让 final artifact 依赖 Vite dev server、HMR 或 dev overlay。
- 在输出阶段重新引入未检查脚本。
- 让交付物隐式依赖难以迁移的运行环境。
- 让未声明 CDN、远程字体、外部 worker 或绝对资源路径成为最终视觉假设。
- 让 portable output 成为额外的样式、脚本或外部资源逃逸口。
