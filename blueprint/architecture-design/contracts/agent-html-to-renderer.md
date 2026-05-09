# agent-html to renderer Contract

本文规定 agent-html 到 renderer 的边界。

## Provider

parse / sanitize 层提供已检查的 agent-html 结构。

## Consumer

renderer 消费已检查结构并生成页面。

## Rules

- renderer 只接收 parse / sanitize 后的结构。
- renderer 只渲染已注册语义积木。
- 未知标签不得绕过安全边界执行。
- script、危险属性和不受控外部资源默认不可进入 renderer。
- raw escape hatch 必须显式标记，并经过安全边界。

## Forbidden

- renderer 直接接收未检查的 agent 输出。
- renderer 默认执行 agent 输出中的脚本。
- renderer 将未知标签当作自由 HTML 执行。
