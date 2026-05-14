import React from "react"

import { resolveElement } from "./elements"
import type { RendererKind } from "./kinds"
import type {
  AgentComponentNode,
  AgentNode,
  RendererPropMapping,
  RendererSpecComponent,
} from "./types"

export function createRendererNode(
  rendererSpecByName: Map<string, RendererSpecComponent>,
) {
  function RendererNode({ node }: { node: AgentNode }) {
    if (node.type === "text") {
      return <p className="m-0 whitespace-pre-wrap">{node.value}</p>
    }

    const rendererSpec = rendererSpecByName.get(node.name)
    if (rendererSpec) {
      return renderComponent(node, rendererSpec)
    }

    if (isRuntimeRenderableComponent(node.name)) {
      throw new Error(
        `Registered renderer component "${node.name}" has no renderer implementation.`,
      )
    }

    throw new Error(`Unsupported renderer component "${node.name}".`)
  }

  function renderComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const render = rendererKindHandlers[rendererSpec.kind as RendererKind]

    if (render) {
      return render(node, rendererSpec)
    }

    throw new Error(
      `Unsupported renderer kind "${rendererSpec.kind}" for "${rendererSpec.name}".`,
    )
  }

  function renderPrimitiveComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const Component = resolveElement(rendererSpec.component)
    const props = {
      "data-agent-html-component": node.name,
      ...applyPropMappings(node.props, rendererSpec.propMappings),
    }
    const children =
      rendererSpec.childMode === "inline"
        ? renderInlineChildren(node)
        : rendererSpec.childMode === "block"
          ? renderChildren(node)
          : undefined

    return <Component {...props}>{children}</Component>
  }

  function renderCompoundComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Title = resolveElement(rendererSpec.title)
    const TitleContainer = resolveElement(rendererSpec.titleContainer)
    const Content = resolveElement(rendererSpec.content)
    const props = {
      "data-agent-html-component": node.name,
      className: rendererSpec.rootClassName,
      ...applyPropMappings(node.props, rendererSpec.propMappings),
    }
    const title = renderCompoundTitle(node, rendererSpec, Title)
    const content =
      rendererSpec.childMode === "inline"
        ? renderInlineChildren(node)
        : renderChildren(node)

    return (
      <Root {...props}>
        {title && TitleContainer ? (
          <TitleContainer>{title}</TitleContainer>
        ) : (
          title
        )}
        {Content ? <Content>{content}</Content> : content}
      </Root>
    )
  }

  function renderCompoundTitle(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    Title: React.ElementType | undefined,
  ) {
    const titleProp = Title
      ? requireRendererSpecField(rendererSpec, "titleProp")
      : undefined
    const title = node.props[titleProp]

    if (!title || !Title) {
      return null
    }

    return <Title className={rendererSpec.titleClassName}>{title}</Title>
  }

  function renderCollectionComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const Root = resolveElement(
      rendererSpec.rootByProp
        ? resolveMappedProp(
            node.props[rendererSpec.rootByProp.prop],
            rendererSpec.rootByProp.map,
            rendererSpec.rootByProp.default,
          )
        : rendererSpec.root,
    )
    const Item = resolveElement(rendererSpec.item)
    const rootProps = {
      "data-agent-html-component": node.name,
      className: rendererSpec.rootClassName,
      ...applyPropMappings(node.props, rendererSpec.propMappings),
    }

    return (
      <Root {...rootProps}>
        {getSlotChildren(node, rendererSpec.itemSlot).map((item, index) => (
          <Item key={index}>
            {rendererSpec.childMode === "inline"
              ? renderInlineChildren(item)
              : renderChildren(item)}
          </Item>
        ))}
      </Root>
    )
  }

  function renderTableComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Header = resolveElement(rendererSpec.header)
    const Body = resolveElement(rendererSpec.body)
    const rowSlot = requireRendererSpecField(rendererSpec, "rowSlot")
    const cellSlot = requireRendererSpecField(rendererSpec, "cellSlot")
    const kindProp = requireRendererSpecField(rendererSpec, "kindProp")
    const headerKind = requireRendererSpecField(rendererSpec, "headerKind")
    const rows = getSlotChildren(node, rowSlot)
    const headerRows = rows.filter(
      (row) => getConfiguredPropValue(row, kindProp) === headerKind,
    )
    const bodyRows = rows.filter(
      (row) => getConfiguredPropValue(row, kindProp) !== headerKind,
    )

    return (
      <Root data-agent-html-component={node.name}>
        {headerRows.length > 0 ? (
          <Header>
            {headerRows.map((row, index) =>
              renderTableRow(row, index, rendererSpec, cellSlot, true),
            )}
          </Header>
        ) : null}
        <Body>
          {bodyRows.map((row, index) =>
            renderTableRow(row, index, rendererSpec, cellSlot, false),
          )}
        </Body>
      </Root>
    )
  }

  function renderTableRow(
    row: AgentComponentNode,
    index: number,
    rendererSpec: RendererSpecComponent,
    cellSlot: string,
    isHeader: boolean,
  ) {
    const Row = resolveElement(rendererSpec.row)
    const Cell = resolveElement(
      isHeader ? rendererSpec.headerCell : rendererSpec.bodyCell,
    )

    return (
      <Row key={index} data-agent-html-component={row.name}>
        {getSlotChildren(row, cellSlot).map((cell, cellIndex) => (
          <Cell key={cellIndex} data-agent-html-component={cell.name}>
            {renderInlineChildren(cell)}
          </Cell>
        ))}
      </Row>
    )
  }

  function renderAccordionComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Item = resolveElement(rendererSpec.item)
    const Trigger = resolveElement(rendererSpec.trigger)
    const Content = resolveElement(rendererSpec.content)
    const itemSlot = requireRendererSpecField(rendererSpec, "itemSlot")
    const itemValueProp = requireRendererSpecField(
      rendererSpec,
      "itemValueProp",
    )
    const itemHeadingProp = requireRendererSpecField(
      rendererSpec,
      "itemHeadingProp",
    )
    const mode = requireRendererSpecField(rendererSpec, "mode")
    const items = getSlotChildren(node, itemSlot)
    const values = items.map((item) => getConfiguredPropValue(item, itemValueProp))

    return (
      <>
        <Root
          data-agent-html-component={node.name}
          type={mode}
          defaultValue={values}
        >
          {items.map((item) => (
            <Item
              key={getConfiguredPropValue(item, itemValueProp)}
              value={getConfiguredPropValue(item, itemValueProp)}
            >
              <Trigger>{getConfiguredPropValue(item, itemHeadingProp)}</Trigger>
              <Content>{renderChildren(item)}</Content>
            </Item>
          ))}
        </Root>
        {rendererSpec.fallback
          ? renderNoScriptSectionFallback(items, itemValueProp, itemHeadingProp)
          : null}
      </>
    )
  }

  function renderTabsComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const List = resolveElement(rendererSpec.list)
    const Trigger = resolveElement(rendererSpec.trigger)
    const Content = resolveElement(rendererSpec.content)
    const itemSlot = requireRendererSpecField(rendererSpec, "itemSlot")
    const itemValueProp = requireRendererSpecField(
      rendererSpec,
      "itemValueProp",
    )
    const itemHeadingProp = requireRendererSpecField(
      rendererSpec,
      "itemHeadingProp",
    )
    const defaultProp = requireRendererSpecField(rendererSpec, "defaultProp")
    const tabs = getSlotChildren(node, itemSlot)

    if (tabs.length === 0) {
      return null
    }

    const defaultValue =
      node.props[defaultProp] || getConfiguredPropValue(tabs[0], itemValueProp)

    return (
      <>
        <Root data-agent-html-component={node.name} defaultValue={defaultValue}>
          <List>
            {tabs.map((tab) => (
              <Trigger
                key={getConfiguredPropValue(tab, itemValueProp)}
                value={getConfiguredPropValue(tab, itemValueProp)}
              >
                {getConfiguredPropValue(tab, itemHeadingProp)}
              </Trigger>
            ))}
          </List>
          {tabs.map((tab) => (
            <Content
              key={getConfiguredPropValue(tab, itemValueProp)}
              value={getConfiguredPropValue(tab, itemValueProp)}
            >
              {renderChildren(tab)}
            </Content>
          ))}
        </Root>
        {rendererSpec.fallback
          ? renderNoScriptSectionFallback(tabs, itemValueProp, itemHeadingProp)
          : null}
      </>
    )
  }

  function renderNoScriptSectionFallback(
    items: AgentComponentNode[],
    itemValueProp: string,
    itemHeadingProp: string,
  ) {
    return (
      <noscript>
        <section className="grid gap-3">
          {items.map((item) => (
            <section
              className="grid gap-3"
              key={getConfiguredPropValue(item, itemValueProp)}
            >
              <h2 className="m-0 text-lg font-medium leading-7">
                {getConfiguredPropValue(item, itemHeadingProp)}
              </h2>
              {renderChildren(item)}
            </section>
          ))}
        </section>
      </noscript>
    )
  }

  function renderChildren(node: AgentComponentNode) {
    return node.children.map((child, index) => (
      <RendererNode key={index} node={child} />
    ))
  }

  function renderInlineChildren(node: AgentComponentNode) {
    return node.children.map((child, index) => {
      if (child.type === "text") {
        return <React.Fragment key={index}>{child.value}</React.Fragment>
      }

      return <RendererNode key={index} node={child} />
    })
  }

  function getSlotChildren(
    node: AgentComponentNode,
    slotName: string | undefined,
  ) {
    const slot = rendererSpecByName
      .get(node.name)
      ?.slots.find((item) => item.name === slotName)
    const childNames = slot?.childNames ?? [slotName]

    return node.children.filter(
      (child): child is AgentComponentNode =>
        child.type === "component" && childNames.includes(child.name),
    )
  }

  function isRuntimeRenderableComponent(name: string) {
    return rendererSpecByName.has(name)
  }

  const rendererKindHandlers: Record<
    RendererKind,
    (
      node: AgentComponentNode,
      rendererSpec: RendererSpecComponent,
    ) => React.ReactNode
  > = {
    primitive: renderPrimitiveComponent,
    compound: renderCompoundComponent,
    collection: renderCollectionComponent,
    table: renderTableComponent,
    "interactive-collection": renderAccordionComponent,
    tabs: renderTabsComponent,
  }

  return RendererNode
}

function applyPropMappings(
  props: Record<string, string>,
  propMappings?: RendererPropMapping[],
) {
  const mapped: Record<string, string> = {}

  for (const mapping of propMappings ?? []) {
    const value = props[mapping.prop]
    const targetValue = value
      ? (mapping.map[value] ?? mapping.default)
      : undefined

    if (targetValue) {
      mapped[mapping.target] = targetValue
    }
  }

  return mapped
}

function resolveMappedProp(
  value: string | undefined,
  map: Record<string, string>,
  defaultValue: string,
) {
  if (!value) {
    return defaultValue
  }

  return map[value] ?? defaultValue
}

function getConfiguredPropValue(
  node: AgentComponentNode,
  propName: string,
) {
  return node.props[propName]
}

function requireRendererSpecField(
  rendererSpec: RendererSpecComponent,
  fieldName: keyof RendererSpecComponent,
) {
  const value = rendererSpec[fieldName]

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Renderer spec "${rendererSpec.name}" is missing required field "${String(fieldName)}".`,
    )
  }

  return value
}
