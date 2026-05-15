import React from "react"

import { resolveElement } from "./elements"
import type { RendererKind } from "./kinds"
import type {
  AgentComponentNode,
  AgentNode,
  RendererPropMapping,
  RendererPropValue,
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

  function renderFieldControlComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Label = resolveElement(rendererSpec.label)
    const Control = resolveElement(rendererSpec.control)
    const Description = resolveElement(rendererSpec.description)
    const labelProp = requireRendererSpecField(rendererSpec, "labelProp")
    const descriptionProp = rendererSpec.description
      ? requireRendererSpecField(rendererSpec, "descriptionProp")
      : undefined
    const Item = rendererSpec.item ? resolveElement(rendererSpec.item) : undefined
    const label = node.props[labelProp]
    const description = descriptionProp
      ? node.props[descriptionProp]
      : undefined
    const itemSlot = rendererSpec.item
      ? requireRendererSpecField(rendererSpec, "itemSlot")
      : undefined
    const itemValueProp = rendererSpec.item
      ? requireRendererSpecField(rendererSpec, "itemValueProp")
      : undefined
    const itemHeadingProp = rendererSpec.item
      ? requireRendererSpecField(rendererSpec, "itemHeadingProp")
      : undefined
    const valueProp = rendererSpec.fallback
      ? requireRendererSpecField(rendererSpec, "valueProp")
      : undefined
    const items =
      itemSlot && Item ? getStructuredItemsForNode(node, itemSlot) : undefined
    const controlProps = applyPropMappings(node.props, rendererSpec.propMappings)

    return (
      <>
        <Root
          data-agent-html-component={node.name}
          className={rendererSpec.rootClassName}
        >
          {label ? (
            <Label className={rendererSpec.labelClassName}>{label}</Label>
          ) : null}
          {Item && items && itemValueProp && itemHeadingProp ? (
            <Control {...controlProps}>
              {items.map((item) => {
                const itemValue = getStructuredItemValue(item, itemValueProp)
                const itemHeading = getStructuredItemHeading(item, itemHeadingProp)

                return (
                  <label
                    className="flex items-start gap-3"
                    key={itemValue || itemHeading}
                  >
                    <Item aria-label={itemHeading} value={itemValue} />
                    <span className="grid gap-1">
                      <span className={rendererSpec.labelClassName}>
                        {itemHeading}
                      </span>
                      {item.children.length > 0 ? (
                        <span className={rendererSpec.descriptionClassName}>
                          {renderInlineChildren(item)}
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </Control>
          ) : (
            <Control {...controlProps} />
          )}
          {description && Description ? (
            <Description className={rendererSpec.descriptionClassName}>
              {description}
            </Description>
          ) : null}
        </Root>
        {rendererSpec.fallback && !Item && valueProp
          ? renderNoScriptFieldControlFallback({
              description,
              label,
              value: node.props[valueProp],
            })
          : null}
      </>
    )
  }

  function renderOptionSetComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Label = resolveElement(rendererSpec.label)
    const ControlRoot = rendererSpec.controlRoot
      ? resolveElement(rendererSpec.controlRoot)
      : React.Fragment
    const Control = resolveElement(rendererSpec.control)
    const ControlTrigger = resolveElement(rendererSpec.controlTrigger)
    const ControlValue = resolveElement(rendererSpec.controlValue)
    const ControlContent = resolveElement(rendererSpec.controlContent)
    const ControlList = rendererSpec.controlList
      ? resolveElement(rendererSpec.controlList)
      : undefined
    const ItemContainer = rendererSpec.itemContainer
      ? resolveElement(rendererSpec.itemContainer)
      : undefined
    const Item = resolveElement(rendererSpec.item)
    const Description = resolveElement(rendererSpec.description)
    const labelProp = requireRendererSpecField(rendererSpec, "labelProp")
    const descriptionProp = rendererSpec.description
      ? requireRendererSpecField(rendererSpec, "descriptionProp")
      : undefined
    const itemSlot = requireRendererSpecField(rendererSpec, "itemSlot")
    const itemValueProp = requireRendererSpecField(rendererSpec, "itemValueProp")
    const itemHeadingProp = requireRendererSpecField(
      rendererSpec,
      "itemHeadingProp",
    )
    const label = node.props[labelProp]
    const description = descriptionProp
      ? node.props[descriptionProp]
      : undefined
    const items = getStructuredItemsForNode(node, itemSlot)
    const optionSetContainerId =
      rendererSpec.itemContainer && rendererSpec.controlListAttr
        ? createOptionSetContainerId(node, itemValueProp, items)
        : undefined
    const controlProps = getOptionSetControlProps({
      itemContainerId: optionSetContainerId,
      rendererSpec,
      props: node.props,
    })
    const selectedValue = controlProps.defaultValue
    const renderedItems = renderOptionSetItems({
      Item,
      ItemContainer,
      itemContainerId: optionSetContainerId,
      itemHeadingProp,
      items,
      itemValueProp,
    })
    const renderedOptionSetContent =
      ControlList && rendererSpec.controlContent ? (
        <ControlList>{renderedItems}</ControlList>
      ) : (
        renderedItems
      )

    return (
      <>
        <Root
          data-agent-html-component={node.name}
          className={rendererSpec.rootClassName}
        >
          {label ? (
            <Label className={rendererSpec.labelClassName}>{label}</Label>
          ) : null}
          <ControlRoot>
            {rendererSpec.controlTrigger && rendererSpec.controlContent ? (
              <Control {...controlProps}>
                <>
                  <ControlTrigger>
                    {rendererSpec.controlValue ? <ControlValue /> : null}
                  </ControlTrigger>
                  <ControlContent>{renderedOptionSetContent}</ControlContent>
                </>
              </Control>
            ) : rendererSpec.controlContent ? (
              <Control {...controlProps}>
                <ControlContent>{renderedOptionSetContent}</ControlContent>
              </Control>
            ) : rendererSpec.itemContainer ? (
              <>
                <Control {...controlProps} />
                {renderedOptionSetContent}
              </>
            ) : (
              <Control {...controlProps}>{renderedOptionSetContent}</Control>
            )}
          </ControlRoot>
          {description && Description ? (
            <Description className={rendererSpec.descriptionClassName}>
              {description}
            </Description>
          ) : null}
        </Root>
        {rendererSpec.fallback
          ? renderNoScriptOptionSetFallback({
              items,
              itemHeadingProp,
              itemValueProp,
              selectedValue,
            })
          : null}
      </>
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
    const items = getStructuredItemsForNode(node, itemSlot)
    const values = items.map((item) =>
      getStructuredItemValue(item, itemValueProp),
    )

    return (
      <>
        <Root
          data-agent-html-component={node.name}
          type={mode}
          defaultValue={values}
        >
          {items.map((item) => (
            <Item
              key={getStructuredItemValue(item, itemValueProp)}
              value={getStructuredItemValue(item, itemValueProp)}
            >
              <Trigger>{getStructuredItemHeading(item, itemHeadingProp)}</Trigger>
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
    const tabs = getStructuredItemsForNode(node, itemSlot)

    if (tabs.length === 0) {
      return null
    }

    const defaultValue = getStructuredDefaultValue({
      explicitValue: node.props[defaultProp],
      items: tabs,
      itemValueProp,
    })

    return (
      <>
        <Root data-agent-html-component={node.name} defaultValue={defaultValue}>
          <List>
            {tabs.map((tab) => (
              <Trigger
                key={getStructuredItemValue(tab, itemValueProp)}
                value={getStructuredItemValue(tab, itemValueProp)}
              >
                {getStructuredItemHeading(tab, itemHeadingProp)}
              </Trigger>
            ))}
          </List>
          {tabs.map((tab) => (
            <Content
              key={getStructuredItemValue(tab, itemValueProp)}
              value={getStructuredItemValue(tab, itemValueProp)}
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

  function renderNoScriptOptionSetFallback({
    items,
    itemHeadingProp,
    itemValueProp,
    selectedValue,
  }: {
    items: AgentComponentNode[]
    itemHeadingProp: string
    itemValueProp: string
    selectedValue?: RendererPropValue
  }) {
    return (
      <noscript>
        <section className="grid gap-3">
          {items.map((item) => {
            const itemValue = getConfiguredPropValue(item, itemValueProp)
            const itemHeading = getConfiguredPropValue(item, itemHeadingProp)
            const selected = selectedValue === itemValue

            return (
              <section className="grid gap-1" key={itemValue || itemHeading}>
                <h2 className="m-0 text-lg font-medium leading-7">
                  {itemHeading}
                  {selected ? " (selected)" : ""}
                </h2>
                {item.children.length > 0 ? (
                  <p className="m-0 text-sm text-muted-foreground">
                    {renderInlineChildren(item)}
                  </p>
                ) : null}
              </section>
            )
          })}
        </section>
      </noscript>
    )
  }

  function renderOptionSetItem({
    Item,
    item,
    itemHeadingProp,
    itemValueProp,
    itemInDatalist = false,
  }: {
    Item: React.ElementType
    item: AgentComponentNode
    itemHeadingProp: string
    itemValueProp: string
    itemInDatalist?: boolean
  }) {
    const itemValue = getStructuredItemValue(item, itemValueProp)
    const itemHeading = getStructuredItemHeading(item, itemHeadingProp)

    if (itemInDatalist) {
      return (
        <Item key={itemValue || itemHeading} label={itemHeading} value={itemValue} />
      )
    }

    return (
      <Item key={itemValue || itemHeading} value={itemValue}>
        {itemHeading}
        {item.children.length > 0 ? (
          <>
            {": "}
            {renderInlineChildren(item)}
          </>
        ) : null}
      </Item>
    )
  }

  function renderNoScriptFieldControlFallback({
    description,
    label,
    value,
  }: {
    description?: string
    label?: string
    value?: string
  }) {
    return (
      <noscript>
        <section className="grid gap-1">
          {label ? (
            <h2 className="m-0 text-lg font-medium leading-7">{label}</h2>
          ) : null}
          {typeof value === "string" && value.length > 0 ? (
            <p className="m-0 text-sm text-muted-foreground">{value}</p>
          ) : null}
          {description ? (
            <p className="m-0 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </section>
      </noscript>
    )
  }

  function renderOptionSetItems({
    Item,
    ItemContainer,
    itemContainerId,
    itemHeadingProp,
    items,
    itemValueProp,
  }: {
    Item: React.ElementType
    ItemContainer?: React.ElementType
    itemContainerId?: string
    itemHeadingProp: string
    items: AgentComponentNode[]
    itemValueProp: string
  }) {
    const renderedItems = items.map((item) =>
      renderOptionSetItem({
        Item,
        item,
        itemHeadingProp,
        itemInDatalist: Boolean(itemContainerId),
        itemValueProp,
      }),
    )

    if (itemContainerId && ItemContainer) {
      return <ItemContainer id={itemContainerId}>{renderedItems}</ItemContainer>
    }

    return renderedItems
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

  function getStructuredItemsForNode(
    node: AgentComponentNode,
    itemSlot: string,
  ) {
    return getSlotChildren(node, itemSlot)
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
    "field-control": renderFieldControlComponent,
    compound: renderCompoundComponent,
    collection: renderCollectionComponent,
    table: renderTableComponent,
    "interactive-collection": renderAccordionComponent,
    "option-set": renderOptionSetComponent,
    tabs: renderTabsComponent,
  }

  return RendererNode
}

function getStructuredItemValue(
  node: AgentComponentNode,
  itemValueProp: string,
) {
  return getConfiguredPropValue(node, itemValueProp)
}

function getStructuredItemHeading(
  node: AgentComponentNode,
  itemHeadingProp: string,
) {
  return getConfiguredPropValue(node, itemHeadingProp)
}

function getStructuredDefaultValue({
  explicitValue,
  items,
  itemValueProp,
}: {
  explicitValue?: string
  items: AgentComponentNode[]
  itemValueProp: string
}) {
  return explicitValue || getStructuredItemValue(items[0], itemValueProp)
}

function getOptionSetControlProps({
  itemContainerId,
  props,
  rendererSpec,
}: {
  itemContainerId?: string
  props: Record<string, string>
  rendererSpec: RendererSpecComponent
}) {
  const controlProps = getRendererProps(props, rendererSpec)

  if (!itemContainerId || !rendererSpec.controlListAttr) {
    return controlProps
  }

  return {
    ...controlProps,
    [rendererSpec.controlListAttr]: itemContainerId,
  }
}

function createOptionSetContainerId(
  node: AgentComponentNode,
  itemValueProp: string,
  items: AgentComponentNode[],
) {
  if (items.length === 0) {
    return undefined
  }

  const seed = [
    node.name,
    node.props.label ?? "",
    ...items.map((item) => getStructuredItemValue(item, itemValueProp) ?? ""),
  ]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return seed.length > 0 ? `${seed}-options` : `${node.name}-options`
}

function applyPropMappings(
  props: Record<string, string>,
  propMappings?: RendererPropMapping[],
) {
  const mapped: Record<string, RendererPropValue> = {}

  for (const mapping of propMappings ?? []) {
    const value = props[mapping.prop]

    if (value === undefined) {
      continue
    }

    if (mapping.map) {
      const targetValue = mapping.map[value] ?? mapping.default

      if (targetValue !== undefined) {
        mapped[mapping.target] = targetValue
      }
      continue
    }

    if (mapping.coerce) {
      mapped[mapping.target] = coercePropValue(value, mapping.coerce)
      continue
    }

    mapped[mapping.target] = value
  }

  return mapped
}

function getRendererProps(
  props: Record<string, string>,
  rendererSpec: RendererSpecComponent,
) {
  return {
    ...(rendererSpec.staticProps ?? {}),
    ...applyPropMappings(props, rendererSpec.propMappings),
  }
}

function coercePropValue(
  value: string,
  kind: NonNullable<RendererPropMapping["coerce"]>,
) {
  if (kind === "boolean") {
    return value === "true"
  }

  if (kind === "number-array") {
    return [Number(value)]
  }

  return Number(value)
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
