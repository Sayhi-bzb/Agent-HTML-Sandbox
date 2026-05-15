import type { RendererKind } from "./kinds"

export type AgentTextNode = {
  type: "text"
  value: string
}

export type AgentComponentNode = {
  type: "component"
  name: string
  props: Record<string, string>
  children: AgentNode[]
}

export type AgentNode = AgentTextNode | AgentComponentNode

export type AgentDocument = {
  meta: {
    theme: string
    density: string
    tone: string
    width: string
  }
  components: AgentNode[]
}

export type RendererSlot = {
  name: string
  children?: string[]
  childNames?: string[]
}

export type RendererPropValue = string | number | boolean

export type RendererPropMapping = {
  prop: string
  target: string
  map?: Record<string, RendererPropValue>
  default?: RendererPropValue
  coerce?: "boolean" | "number"
}

export type RendererRootByProp = {
  prop: string
  target: "tag"
  map: Record<string, string>
  default: string
}

export type RendererSpecComponent = {
  name: string
  source?: string
  kind: RendererKind | "structural"
  renderKind: string
  requiredRegistryItem?: string
  requiredExports?: string[]
  slots: RendererSlot[]
  childMode?: "block" | "inline" | "none"
  component?: string
  control?: string
  controlContent?: string
  controlTrigger?: string
  controlValue?: string
  label?: string
  description?: string
  root?: string
  title?: string
  titleContainer?: string
  content?: string
  list?: string
  trigger?: string
  body?: string
  header?: string
  row?: string
  headerCell?: string
  bodyCell?: string
  item?: string
  itemSlot?: string
  rowSlot?: string
  cellSlot?: string
  rootClassName?: string
  labelClassName?: string
  descriptionClassName?: string
  titleClassName?: string
  labelProp?: string
  descriptionProp?: string
  titleProp?: string
  defaultProp?: string
  fallback?: boolean
  mode?: string
  headerKind?: string
  kindProp?: string
  itemValueProp?: string
  itemHeadingProp?: string
  rootByProp?: RendererRootByProp
  propMappings?: RendererPropMapping[]
  staticProps?: Record<string, RendererPropValue>
}

export type RuntimeCapabilities = {
  verificationData: {
    components: {
      name: string
      renderKind?: string
      slots?: RendererSlot[]
    }[]
  }
  rendererMapping: {
    version: number
    components: RendererSpecComponent[]
  }
}
