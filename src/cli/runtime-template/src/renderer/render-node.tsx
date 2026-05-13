import React from "react"

import { resolveElement } from "./elements"
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
      return <p className="ahtml-text">{node.value}</p>
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
    switch (rendererSpec.kind) {
      case "primitive":
        return renderPrimitiveComponent(node, rendererSpec)
      case "compound":
        return renderCompoundComponent(node, rendererSpec)
      case "collection":
        return renderCollectionComponent(node, rendererSpec)
      case "table":
        return renderTableComponent(node, rendererSpec)
      case "interactive-collection":
        return renderAccordionComponent(node, rendererSpec)
      case "tabs":
        return renderTabsComponent(node, rendererSpec)
      default:
        throw new Error(
          `Unsupported renderer kind "${rendererSpec.kind}" for "${rendererSpec.name}".`,
        )
    }
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
    const titleProp = rendererSpec.titleProp ?? "title"
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
    const rows = getSlotChildren(node, rendererSpec.rowSlot)
    const headerRows = rows.filter(
      (row) => row.props.kind === rendererSpec.headerKind,
    )
    const bodyRows = rows.filter(
      (row) => row.props.kind !== rendererSpec.headerKind,
    )

    return (
      <Root data-agent-html-component={node.name}>
        {headerRows.length > 0 ? (
          <Header>
            {headerRows.map((row, index) =>
              renderTableRow(row, index, rendererSpec, true),
            )}
          </Header>
        ) : null}
        <Body>
          {bodyRows.map((row, index) =>
            renderTableRow(row, index, rendererSpec, false),
          )}
        </Body>
      </Root>
    )
  }

  function renderTableRow(
    row: AgentComponentNode,
    index: number,
    rendererSpec: RendererSpecComponent,
    isHeader: boolean,
  ) {
    const Row = resolveElement(rendererSpec.row)
    const Cell = resolveElement(
      isHeader ? rendererSpec.headerCell : rendererSpec.bodyCell,
    )

    return (
      <Row key={index} data-agent-html-component={row.name}>
        {getSlotChildren(row, rendererSpec.cellSlot).map((cell, cellIndex) => (
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
    const items = getSlotChildren(node, rendererSpec.itemSlot)
    const values = items.map(getAccordionItemValue)

    return (
      <Root
        data-agent-html-component={node.name}
        type={rendererSpec.mode ?? "multiple"}
        defaultValue={values}
      >
        {items.map((item) => (
          <Item
            key={getAccordionItemValue(item)}
            value={getAccordionItemValue(item)}
          >
            <Trigger>{item.props.title}</Trigger>
            <Content>{renderChildren(item)}</Content>
          </Item>
        ))}
      </Root>
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
    const tabs = getSlotChildren(node, rendererSpec.itemSlot)

    if (tabs.length === 0) {
      return null
    }

    const defaultProp = rendererSpec.defaultProp ?? "default"
    const defaultValue = node.props[defaultProp] || getTabValue(tabs[0])

    return (
      <>
        <Root data-agent-html-component={node.name} defaultValue={defaultValue}>
          <List>
            {tabs.map((tab) => (
              <Trigger key={getTabValue(tab)} value={getTabValue(tab)}>
                {tab.props.label}
              </Trigger>
            ))}
          </List>
          {tabs.map((tab) => (
            <Content key={getTabValue(tab)} value={getTabValue(tab)}>
              {renderChildren(tab)}
            </Content>
          ))}
        </Root>
        {rendererSpec.fallback ? renderTabsNoScriptFallback(tabs) : null}
      </>
    )
  }

  function renderTabsNoScriptFallback(tabs: AgentComponentNode[]) {
    return (
      <noscript>
        <section className="ahtml-section">
          {tabs.map((tab) => (
            <section className="ahtml-section" key={getTabValue(tab)}>
              <h2 className="ahtml-section-title">{tab.props.label}</h2>
              {renderChildren(tab)}
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

  return RendererNode
}

function getTabValue(tab: AgentComponentNode) {
  return tab.props.value
}

function getAccordionItemValue(item: AgentComponentNode) {
  return item.props.value
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
