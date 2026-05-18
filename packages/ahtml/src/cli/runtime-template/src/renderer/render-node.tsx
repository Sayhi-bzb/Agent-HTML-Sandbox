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

type RendererPathSegment = number | string
type RendererPath = RendererPathSegment[]

export function createRendererNode(
  rendererSpecByName: Map<string, RendererSpecComponent>,
  componentTreatments: Record<string, string> = {},
) {
  function RendererNode({
    node,
    path = [0],
  }: {
    node: AgentNode
    path?: RendererPath
  }) {
    if (node.type === "text") {
      return <p className="m-0 whitespace-pre-wrap">{node.value}</p>
    }

    const rendererSpec = rendererSpecByName.get(node.name)
    if (rendererSpec) {
      return renderComponent(node, rendererSpec, path)
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
    path: RendererPath,
  ) {
    const render = rendererKindHandlers[rendererSpec.kind as RendererKind]

    if (render) {
      return render(node, rendererSpec, path)
    }

    throw new Error(
      `Unsupported renderer kind "${rendererSpec.kind}" for "${rendererSpec.name}".`,
    )
  }

  function getComponentMetadataProps(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
  ) {
    const treatment = componentTreatments[node.name]
    const className = mergeClassNames(
      rendererSpec.rootClassName,
      treatment ? componentTreatmentClassNames[treatment] : undefined,
    )

    return {
      "data-agent-html-component": node.name,
      ...(treatment ? { "data-ahtml-treatment": treatment } : {}),
      ...(className ? { className } : {}),
    }
  }

  function renderPrimitiveComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    const Component = resolveElement(rendererSpec.component)
    const props = {
      ...getComponentMetadataProps(node, rendererSpec),
      ...applyPropMappings(node.props, rendererSpec.propMappings),
    }
    const children =
      rendererSpec.childMode === "inline"
        ? renderInlineChildren(node, path)
        : rendererSpec.childMode === "block"
          ? renderChildren(node, path)
          : undefined

    return <Component {...props}>{children}</Component>
  }

  function renderCompoundComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Title = resolveElement(rendererSpec.title)
    const TitleContainer = resolveElement(rendererSpec.titleContainer)
    const Content = resolveElement(rendererSpec.content)
    const props = {
      ...getComponentMetadataProps(node, rendererSpec),
      ...applyPropMappings(node.props, rendererSpec.propMappings),
    }
    const title = renderCompoundTitle(node, rendererSpec, Title)
    const content =
      rendererSpec.childMode === "inline"
        ? renderInlineChildren(node, path)
        : renderChildren(node, path)

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

  function renderTextFieldComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Label = resolveElement(rendererSpec.label)
    const Control = resolveElement(rendererSpec.control)
    const Description = resolveElement(rendererSpec.description)
    const labelProp = requireRendererSpecField(rendererSpec, "labelProp")
    const descriptionProp = rendererSpec.description
      ? requireRendererSpecField(rendererSpec, "descriptionProp")
      : undefined
    const valueProp = rendererSpec.fallback
      ? requireRendererSpecField(rendererSpec, "valueProp")
      : undefined
    const label = node.props[labelProp]
    const description = descriptionProp
      ? node.props[descriptionProp]
      : undefined
    const fieldSemantics = createFieldSemantics({
      description,
      label,
      name: node.name,
      path,
    })
    const controlProps = {
      ...rendererSpec.staticProps,
      ...applyPropMappings(node.props, rendererSpec.propMappings),
      ...getFieldControlProps(fieldSemantics),
    }

    return (
      <>
        <Root {...getComponentMetadataProps(node, rendererSpec)}>
          {label ? (
            <Label
              {...getFieldLabelProps(fieldSemantics, true)}
              className={rendererSpec.labelClassName}
            >
              {label}
            </Label>
          ) : null}
          <Control {...controlProps} />
          {description && Description ? (
            <Description
              {...getFieldDescriptionProps(fieldSemantics)}
              className={rendererSpec.descriptionClassName}
            >
              {description}
            </Description>
          ) : null}
        </Root>
        {rendererSpec.fallback && valueProp
          ? renderNoScriptFieldControlFallback({
              description,
              label,
              value: node.props[valueProp],
            })
          : null}
      </>
    )
  }

  function renderToggleFieldComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const FieldContent = resolveElement("FieldContent")
    const Label = resolveElement(rendererSpec.label)
    const Control = resolveElement(rendererSpec.control)
    const Description = resolveElement(rendererSpec.description)
    const labelProp = requireRendererSpecField(rendererSpec, "labelProp")
    const descriptionProp = rendererSpec.description
      ? requireRendererSpecField(rendererSpec, "descriptionProp")
      : undefined
    const label = node.props[labelProp]
    const description = descriptionProp
      ? node.props[descriptionProp]
      : undefined
    const fieldSemantics = createFieldSemantics({
      description,
      label,
      name: node.name,
      path,
    })
    const controlProps = {
      ...rendererSpec.staticProps,
      ...applyPropMappings(node.props, rendererSpec.propMappings),
      ...getFieldControlProps(fieldSemantics),
    }

    return (
      <Root
        {...getComponentMetadataProps(node, rendererSpec)}
        orientation="horizontal"
      >
        <Control {...controlProps} />
        <FieldContent>
          {label ? (
            <Label
              {...getFieldLabelProps(fieldSemantics, true)}
              className={rendererSpec.labelClassName}
            >
              {label}
            </Label>
          ) : null}
          {description && Description ? (
            <Description
              {...getFieldDescriptionProps(fieldSemantics)}
              className={rendererSpec.descriptionClassName}
            >
              {description}
            </Description>
          ) : null}
        </FieldContent>
      </Root>
    )
  }

  function renderRangeFieldComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    return renderTextFieldComponent(node, rendererSpec, path)
  }

  function renderChoiceGroupComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const FieldContent = resolveElement("FieldContent")
    const GroupLabel = resolveElement(rendererSpec.label)
    const ItemLabel = resolveElement("FieldTitle")
    const Control = resolveElement(rendererSpec.control)
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
    const fieldSemantics = createFieldSemantics({
      description,
      label,
      name: node.name,
      path,
    })
    const controlProps = {
      ...getRendererProps(node.props, rendererSpec),
      ...getFieldLabelledByProps(fieldSemantics),
    }

    return (
      <Root {...getComponentMetadataProps(node, rendererSpec)}>
        {label ? (
          <GroupLabel
            {...getFieldLabelProps(fieldSemantics, false)}
            className={rendererSpec.labelClassName}
          >
            {label}
          </GroupLabel>
        ) : null}
        <Control {...controlProps}>
          {items.map((item, index) => {
            const itemValue = getStructuredItemValue(item, itemValueProp)
            const itemHeading = getStructuredItemHeading(item, itemHeadingProp)
            const itemPath = appendRendererPath(path, index)
            const itemSemantics = createFieldSemantics({
              description: item.children.length > 0 ? "option-description" : undefined,
              label: itemHeading,
              name: item.name,
              path: itemPath,
            })

            return (
              <Root
                key={itemValue || itemHeading}
                data-agent-html-component={item.name}
                orientation="horizontal"
              >
                <Item
                  {...getFieldControlProps(itemSemantics)}
                  value={itemValue}
                />
                <FieldContent>
                  <ItemLabel
                    {...getFieldLabelProps(itemSemantics, false)}
                    className={rendererSpec.labelClassName}
                  >
                    {itemHeading}
                  </ItemLabel>
                  {item.children.length > 0 ? (
                    <Description
                      {...getFieldDescriptionProps(itemSemantics)}
                      className={rendererSpec.descriptionClassName}
                    >
                      {renderInlineChildren(item, itemPath)}
                    </Description>
                  ) : null}
                </FieldContent>
              </Root>
            )
          })}
        </Control>
        {description && Description ? (
          <Description
            {...getFieldDescriptionProps(fieldSemantics)}
            className={rendererSpec.descriptionClassName}
          >
            {description}
          </Description>
        ) : null}
      </Root>
    )
  }

  function renderChoiceInlineComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Label = resolveElement(rendererSpec.label)
    const Control = resolveElement(rendererSpec.control)
    const Item = resolveElement(rendererSpec.item)
    const Description = resolveElement(rendererSpec.description)
    const labelProp = requireRendererSpecField(rendererSpec, "labelProp")
    const descriptionProp = rendererSpec.description
      ? requireRendererSpecField(rendererSpec, "descriptionProp")
      : undefined
    const itemSlot = requireRendererSpecField(rendererSpec, "itemSlot")
    const itemValueProp = requireRendererSpecField(
      rendererSpec,
      "itemValueProp",
    )
    const itemHeadingProp = requireRendererSpecField(
      rendererSpec,
      "itemHeadingProp",
    )
    const label = node.props[labelProp]
    const description = descriptionProp
      ? node.props[descriptionProp]
      : undefined
    const items = getStructuredItemsForNode(node, itemSlot)
    const fieldSemantics = createFieldSemantics({
      description,
      label,
      name: node.name,
      path,
    })
    const controlProps = {
      ...getRendererProps(node.props, rendererSpec),
      ...getFieldLabelledByProps(fieldSemantics),
    }

    return (
      <Root {...getComponentMetadataProps(node, rendererSpec)}>
        {label ? (
          <Label
            {...getFieldLabelProps(fieldSemantics, false)}
            className={rendererSpec.labelClassName}
          >
            {label}
          </Label>
        ) : null}
        <Control {...controlProps}>
          {items.map((item, index) =>
            renderOptionSetItem({
              Item,
              item,
              itemHeadingProp,
              path: appendRendererPath(path, index),
              itemValueProp,
            }),
          )}
        </Control>
        {description && Description ? (
          <Description
            {...getFieldDescriptionProps(fieldSemantics)}
            className={rendererSpec.descriptionClassName}
          >
            {description}
          </Description>
        ) : null}
      </Root>
    )
  }

  function renderSelectOverlayComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Label = resolveElement(rendererSpec.label)
    const Control = resolveElement(rendererSpec.control)
    const ControlTrigger = resolveElement(rendererSpec.controlTrigger)
    const ControlValue = resolveElement(rendererSpec.controlValue)
    const ControlContent = resolveElement(rendererSpec.controlContent)
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
    const itemValueProp = requireRendererSpecField(
      rendererSpec,
      "itemValueProp",
    )
    const itemHeadingProp = requireRendererSpecField(
      rendererSpec,
      "itemHeadingProp",
    )
    const label = node.props[labelProp]
    const description = descriptionProp
      ? node.props[descriptionProp]
      : undefined
    const items = getStructuredItemsForNode(node, itemSlot)
    const fieldSemantics = createFieldSemantics({
      description,
      label,
      name: node.name,
      path,
    })
    const controlProps = getRendererProps(node.props, rendererSpec)
    const triggerProps = getFieldControlProps(fieldSemantics)
    const selectedValue = controlProps.defaultValue
    const renderedItems = renderOptionSetItems({
      Item,
      ItemContainer,
      itemHeadingProp,
      items,
      itemValueProp,
      path,
    })

    return (
      <>
        <Root {...getComponentMetadataProps(node, rendererSpec)}>
          {label ? (
            <Label
              {...getFieldLabelProps(fieldSemantics, false)}
              className={rendererSpec.labelClassName}
            >
              {label}
            </Label>
          ) : null}
          <Control {...controlProps}>
            <ControlTrigger {...triggerProps}>
              {rendererSpec.controlValue ? <ControlValue /> : null}
            </ControlTrigger>
            <ControlContent>{renderedItems}</ControlContent>
          </Control>
          {description && Description ? (
            <Description
              {...getFieldDescriptionProps(fieldSemantics)}
              className={rendererSpec.descriptionClassName}
            >
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

  function renderComboboxInputComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
  ) {
    const Root = resolveElement(rendererSpec.root)
    const Label = resolveElement(rendererSpec.label)
    const ControlRoot = resolveElement(rendererSpec.controlRoot)
    const Control = resolveElement(rendererSpec.control)
    const ControlContent = resolveElement(rendererSpec.controlContent)
    const ControlEmpty = resolveElement(rendererSpec.controlEmpty)
    const ControlList = resolveElement(rendererSpec.controlList)
    const ItemContainer = resolveElement(rendererSpec.itemContainer)
    const Item = resolveElement(rendererSpec.item)
    const Description = resolveElement(rendererSpec.description)
    const labelProp = requireRendererSpecField(rendererSpec, "labelProp")
    const descriptionProp = rendererSpec.description
      ? requireRendererSpecField(rendererSpec, "descriptionProp")
      : undefined
    const itemSlot = requireRendererSpecField(rendererSpec, "itemSlot")
    const itemValueProp = requireRendererSpecField(
      rendererSpec,
      "itemValueProp",
    )
    const itemHeadingProp = requireRendererSpecField(
      rendererSpec,
      "itemHeadingProp",
    )
    const label = node.props[labelProp]
    const description = descriptionProp
      ? node.props[descriptionProp]
      : undefined
    const items = getStructuredItemsForNode(node, itemSlot)
    const fieldSemantics = createFieldSemantics({
      description,
      label,
      name: node.name,
      path,
    })
    const comboboxItems = createComboboxItems(items, itemValueProp, itemHeadingProp)
    const selectedItem = findComboboxSelectedItem(comboboxItems, node.props.value)
    const controlRootProps = {
      ...(rendererSpec.staticProps ?? {}),
      items: comboboxItems,
      ...(selectedItem ? { defaultValue: selectedItem } : {}),
    }
    const controlProps = getFieldControlProps(fieldSemantics)

    return (
      <>
        <Root {...getComponentMetadataProps(node, rendererSpec)}>
          {label ? (
            <Label
              {...getFieldLabelProps(fieldSemantics, false)}
              className={rendererSpec.labelClassName}
            >
              {label}
            </Label>
          ) : null}
          <ControlRoot {...controlRootProps}>
            <Control {...controlProps} />
            <ControlContent>
              {ControlEmpty && rendererSpec.emptyText ? (
                <ControlEmpty>{rendererSpec.emptyText}</ControlEmpty>
              ) : null}
              <ControlList>
                <ItemContainer>
                  {(item: ComboboxRendererItem) => (
                    <Item key={item.value} value={item}>
                      {item.label}
                      {item.description ? (
                        <>
                          {": "}
                          {item.description}
                        </>
                      ) : null}
                    </Item>
                  )}
                </ItemContainer>
              </ControlList>
            </ControlContent>
          </ControlRoot>
          {description && Description ? (
            <Description
              {...getFieldDescriptionProps(fieldSemantics)}
              className={rendererSpec.descriptionClassName}
            >
              {description}
            </Description>
          ) : null}
        </Root>
        {rendererSpec.fallback
          ? renderNoScriptOptionSetFallback({
              items,
              itemHeadingProp,
              itemValueProp,
              selectedValue: node.props.value,
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
    const title = titleProp ? node.props[titleProp] : undefined

    if (!title || !Title) {
      return null
    }

    return <Title className={rendererSpec.titleClassName}>{title}</Title>
  }

  function renderCollectionComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
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
      ...getComponentMetadataProps(node, rendererSpec),
      ...applyPropMappings(node.props, rendererSpec.propMappings),
    }

    return (
      <Root {...rootProps}>
        {getSlotChildren(node, rendererSpec.itemSlot).map((item, index) => (
          <Item key={index}>
            {rendererSpec.childMode === "inline"
              ? renderInlineChildren(item, appendRendererPath(path, index))
              : renderChildren(item, appendRendererPath(path, index))}
          </Item>
        ))}
      </Root>
    )
  }

  function renderTableComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
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
      <Root {...getComponentMetadataProps(node, rendererSpec)}>
        {headerRows.length > 0 ? (
          <Header>
            {headerRows.map((row, index) =>
              renderTableRow(
                row,
                index,
                rendererSpec,
                cellSlot,
                true,
                appendRendererPath(path, "header", index),
              ),
            )}
          </Header>
        ) : null}
        <Body>
          {bodyRows.map((row, index) =>
            renderTableRow(
              row,
              index,
              rendererSpec,
              cellSlot,
              false,
              appendRendererPath(path, "body", index),
            ),
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
    path: RendererPath,
  ) {
    const Row = resolveElement(rendererSpec.row)
    const Cell = resolveElement(
      isHeader ? rendererSpec.headerCell : rendererSpec.bodyCell,
    )

    return (
      <Row key={index} data-agent-html-component={row.name}>
        {getSlotChildren(row, cellSlot).map((cell, cellIndex) => (
          <Cell key={cellIndex} data-agent-html-component={cell.name}>
            {renderInlineChildren(cell, appendRendererPath(path, cellIndex))}
          </Cell>
        ))}
      </Row>
    )
  }

  function renderAccordionComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
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
    const modeProp = requireRendererSpecField(rendererSpec, "modeProp")
    const defaultProp = requireRendererSpecField(rendererSpec, "defaultProp")
    const items = getStructuredItemsForNode(node, itemSlot)
    const mode = resolveAccordionMode({
      explicitMode: node.props[modeProp],
      fallbackMode: rendererSpec.defaultMode,
    })
    const defaultValue = resolveAccordionDefaultValue({
      defaultPropValue: node.props[defaultProp],
      mode,
    })
    const rootProps = {
      ...getComponentMetadataProps(node, rendererSpec),
      type: mode,
      ...(defaultValue !== undefined ? { defaultValue } : {}),
    }

    return (
      <>
        <Root {...rootProps}>
          {items.map((item, index) => (
            <Item
              key={getStructuredItemValue(item, itemValueProp)}
              value={getStructuredItemValue(item, itemValueProp)}
            >
              <Trigger>
                {getStructuredItemHeading(item, itemHeadingProp)}
              </Trigger>
              <Content>{renderChildren(item, appendRendererPath(path, index))}</Content>
            </Item>
          ))}
        </Root>
        {rendererSpec.fallback
          ? renderNoScriptSectionFallback(
              items,
              itemValueProp,
              itemHeadingProp,
              appendRendererPath(path, "noscript"),
            )
          : null}
      </>
    )
  }

  function renderTabsComponent(
    node: AgentComponentNode,
    rendererSpec: RendererSpecComponent,
    path: RendererPath,
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
        <Root
          {...getComponentMetadataProps(node, rendererSpec)}
          defaultValue={defaultValue}
        >
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
          {tabs.map((tab, index) => (
            <Content
              key={getStructuredItemValue(tab, itemValueProp)}
              value={getStructuredItemValue(tab, itemValueProp)}
            >
              {renderChildren(tab, appendRendererPath(path, index))}
            </Content>
          ))}
        </Root>
        {rendererSpec.fallback
          ? renderNoScriptSectionFallback(
              tabs,
              itemValueProp,
              itemHeadingProp,
              appendRendererPath(path, "noscript"),
            )
          : null}
      </>
    )
  }

  function renderNoScriptSectionFallback(
    items: AgentComponentNode[],
    itemValueProp: string,
    itemHeadingProp: string,
    path: RendererPath,
  ) {
    return (
      <noscript>
        <section className="grid gap-3">
          {items.map((item, index) => (
            <section
              className="grid gap-3"
              key={getConfiguredPropValue(item, itemValueProp)}
            >
              <h2 className="m-0 text-lg font-medium leading-7">
                {getConfiguredPropValue(item, itemHeadingProp)}
              </h2>
              {renderChildren(item, appendRendererPath(path, index))}
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
    const Field = resolveElement("Field")
    const Label = resolveElement("FieldLabel")
    const Description = resolveElement("FieldDescription")

    return (
      <noscript>
        <section className="grid gap-3">
          {items.map((item) => {
            const itemValue = getConfiguredPropValue(item, itemValueProp)
            const itemHeading = getConfiguredPropValue(item, itemHeadingProp)
            const selected = selectedValue === itemValue

            return (
              <Field key={itemValue || itemHeading}>
                <Label>
                  {itemHeading}
                  {selected ? " (selected)" : ""}
                </Label>
                {item.children.length > 0 ? (
                  <Description>{renderInlineChildren(item, ["noscript"])}</Description>
                ) : null}
              </Field>
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
    path,
  }: {
    Item: React.ElementType
    item: AgentComponentNode
    itemHeadingProp: string
    itemValueProp: string
    path: RendererPath
  }) {
    const itemValue = getStructuredItemValue(item, itemValueProp)
    const itemHeading = getStructuredItemHeading(item, itemHeadingProp)

    return (
      <Item key={itemValue || itemHeading} value={itemValue}>
        {itemHeading}
        {item.children.length > 0 ? (
          <>
            {": "}
            {renderInlineChildren(item, path)}
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
    const Field = resolveElement("Field")
    const Label = resolveElement("FieldLabel")
    const Description = resolveElement("FieldDescription")

    return (
      <noscript>
        <Field>
          {label ? <Label>{label}</Label> : null}
          {typeof value === "string" && value.length > 0 ? (
            <Description>{value}</Description>
          ) : null}
          {description ? <Description>{description}</Description> : null}
        </Field>
      </noscript>
    )
  }

  function renderOptionSetItems({
    Item,
    ItemContainer,
    itemHeadingProp,
    items,
    itemValueProp,
    path,
  }: {
    Item: React.ElementType
    ItemContainer?: React.ElementType
    itemHeadingProp: string
    items: AgentComponentNode[]
    itemValueProp: string
    path: RendererPath
  }) {
    const renderedItems = items.map((item, index) =>
      renderOptionSetItem({
        Item,
        item,
        itemHeadingProp,
        path: appendRendererPath(path, index),
        itemValueProp,
      }),
    )

    if (ItemContainer) {
      return <ItemContainer>{renderedItems}</ItemContainer>
    }

    return renderedItems
  }

  function renderChildren(node: AgentComponentNode, path: RendererPath) {
    return node.children.map((child, index) => (
      <RendererNode
        key={index}
        node={child}
        path={appendRendererPath(path, index)}
      />
    ))
  }

  function renderInlineChildren(node: AgentComponentNode, path: RendererPath) {
    return node.children.map((child, index) => {
      if (child.type === "text") {
        return <React.Fragment key={index}>{child.value}</React.Fragment>
      }

      return (
        <RendererNode
          key={index}
          node={child}
          path={appendRendererPath(path, index)}
        />
      )
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
      path: RendererPath,
    ) => React.ReactNode
  > = {
    primitive: renderPrimitiveComponent,
    "text-field": renderTextFieldComponent,
    "toggle-field": renderToggleFieldComponent,
    "range-field": renderRangeFieldComponent,
    "choice-group": renderChoiceGroupComponent,
    "choice-inline": renderChoiceInlineComponent,
    "combobox-input": renderComboboxInputComponent,
    compound: renderCompoundComponent,
    collection: renderCollectionComponent,
    table: renderTableComponent,
    accordion: renderAccordionComponent,
    "select-overlay": renderSelectOverlayComponent,
    tabs: renderTabsComponent,
  }

  return RendererNode
}

const componentTreatmentClassNames: Record<string, string> = {
  "ops-alert": "border border-border/80 bg-card/95 shadow-sm",
  "ops-badge": "uppercase tracking-[0.18em] text-[0.65rem]",
  "ops-card": "rounded-xl border-border/80 shadow-sm",
  "ops-field": "gap-2 [&_input]:h-9 [&_textarea]:min-h-28",
  "ops-table":
    "[&_td]:py-2 [&_th]:py-2 [&_th]:text-[0.68rem] [&_th]:uppercase [&_th]:tracking-[0.2em]",
  "ops-tabs": "gap-3 [&_button]:h-8 [&_button]:text-xs [&_button]:tracking-[0.1em]",
  "report-alert": "border-l-4 border-l-primary/70 shadow-sm",
  "report-badge": "uppercase tracking-[0.14em]",
  "report-card": "rounded-2xl border-border/70 shadow-sm",
  "report-field": "gap-3 [&_input]:bg-card/90 [&_textarea]:bg-card/90",
  "report-table":
    "[&_th]:text-xs [&_th]:uppercase [&_th]:tracking-[0.16em]",
  "report-tabs":
    "gap-4 [&_button]:rounded-full [&_button]:tracking-[0.02em]",
  "review-alert": "border-l-4 border-l-foreground/30 bg-muted/35",
  "review-badge": "font-semibold tracking-[0.1em]",
  "review-card": "rounded-xl border-border/90",
  "review-field":
    "gap-2 [&_input]:border-border/90 [&_textarea]:border-border/90",
  "review-table": "[&_td]:align-top [&_td]:py-2 [&_th]:text-[0.72rem]",
  "review-tabs":
    "gap-3 [&_button]:font-medium [&_button]:tracking-[0.05em]",
}

type FieldSemantics = {
  controlId: string
  labelId?: string
  descriptionId?: string
}

type ComboboxRendererItem = {
  value: string
  label: string
  description?: string
}

function mergeClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ") || undefined
}

function appendRendererPath(
  path: RendererPath,
  ...segments: RendererPathSegment[]
) {
  return [...path, ...segments]
}

function createNodeDomId(name: string, path: RendererPath) {
  return ["ahtml", name, ...path.map(String)]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function createFieldSemantics({
  description,
  label,
  name,
  path,
}: {
  description?: string
  label?: string
  name: string
  path: RendererPath
}) {
  const fieldId = createNodeDomId(name, path)

  return {
    controlId: `${fieldId}-control`,
    ...(label ? { labelId: `${fieldId}-label` } : {}),
    ...(description ? { descriptionId: `${fieldId}-description` } : {}),
  } satisfies FieldSemantics
}

function getFieldControlProps(fieldSemantics: FieldSemantics) {
  return {
    id: fieldSemantics.controlId,
    ...getFieldLabelledByProps(fieldSemantics),
  }
}

function getFieldLabelledByProps(fieldSemantics: FieldSemantics) {
  return {
    ...(fieldSemantics.labelId
      ? { "aria-labelledby": fieldSemantics.labelId }
      : {}),
    ...(fieldSemantics.descriptionId
      ? { "aria-describedby": fieldSemantics.descriptionId }
      : {}),
  }
}

function getFieldLabelProps(
  fieldSemantics: FieldSemantics,
  labelableControl: boolean,
) {
  return {
    ...(fieldSemantics.labelId ? { id: fieldSemantics.labelId } : {}),
    ...(labelableControl ? { htmlFor: fieldSemantics.controlId } : {}),
  }
}

function getFieldDescriptionProps(fieldSemantics: FieldSemantics) {
  return fieldSemantics.descriptionId
    ? { id: fieldSemantics.descriptionId }
    : {}
}

function createComboboxItems(
  items: AgentComponentNode[],
  itemValueProp: string,
  itemHeadingProp: string,
) {
  return items.map((item) => ({
    value: getStructuredItemValue(item, itemValueProp),
    label: getStructuredItemHeading(item, itemHeadingProp),
    ...(item.children.length > 0
      ? { description: renderInlineTextContent(item.children) }
      : {}),
  }))
}

function findComboboxSelectedItem(
  items: ComboboxRendererItem[],
  value: string | undefined,
) {
  if (!value) {
    return undefined
  }

  return items.find((item) => item.value === value) ?? {
    value,
    label: value,
  }
}

function renderInlineTextContent(children: AgentNode[]) {
  return children
    .map((child) => (child.type === "text" ? child.value : ""))
    .join("")
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

function resolveAccordionMode({
  explicitMode,
  fallbackMode,
}: {
  explicitMode?: string
  fallbackMode?: string
}) {
  return explicitMode === "single" || explicitMode === "multiple"
    ? explicitMode
    : fallbackMode === "single"
      ? "single"
      : "multiple"
}

function resolveAccordionDefaultValue({
  defaultPropValue,
  mode,
}: {
  defaultPropValue?: string
  mode: "single" | "multiple"
}) {
  if (!defaultPropValue) {
    return undefined
  }

  const values = defaultPropValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  if (values.length === 0) {
    return undefined
  }

  return mode === "single" ? values[0] : values
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

function getConfiguredPropValue(node: AgentComponentNode, propName: string) {
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
