## 配置层
引用：style-ref

- 全局样式
负责 theme token、字体、radius、spacing、shadow、semantic colors
- 组件样式

## 语义使用层
暴露：ComponentSchema
- 标准化语义组件
- 语义 props
- slots / children 边界

## 渲染层
- runtime
承载 React / Vite / Tailwind / shadcn
-- runtime-template
- 消费全局样式token
- render渲染

### layout 架构
1.全局 layout 配置层：整篇文档怎么排
- 页面最大宽度
- 页面边距
- section 间距
- 栅格列数规则
- 响应式断点下怎么收缩
2.组件 layout 配置层：每个标准组件内部怎么排
- card 的 header / body / footer 间距
- tabs 的 trigger 区和 content 区关系
- table 的密度、列间距、对齐策略
- form 组件是 label 在上还是在左
3.语义 layout 使用层：作者/agent 用什么布局语义去组织内容
- page
- section
- stack
- grid
- split
- aside

### style 架构
1.全局样式-配置层：整篇文档的视觉基线
- semantic colors
- 字体
- radius
- spacing scale
- shadow
- light/dark token sets
2.组件样式-配置层：各标准组件的视觉映射
- card 用哪种外观
- tabs 用哪种触发器样式
- table 用哪种密度和表头风格
- alert 用哪种强调方式
3.语义样式-使用层：作者可用的受控视觉入口
- 文档级 style-ref
- 少量被允许的语义外观词，比如 tone="success"、tone="danger"