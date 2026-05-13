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
  childNames?: string[]
}

export type RendererPropMapping = {
  prop: string
  target: string
  map: Record<string, string>
  default?: string
}

export type RendererRootByProp = {
  prop: string
  target: "tag"
  map: Record<string, string>
  default: string
}

export type RendererSpecComponent = {
  name: string
  kind:
    | "primitive"
    | "compound"
    | "collection"
    | "table"
    | "interactive-collection"
    | "tabs"
    | "structural"
  renderKind: string
  slots: RendererSlot[]
  childMode?: "block" | "inline" | "none"
  component?: string
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
  titleClassName?: string
  titleProp?: string
  defaultProp?: string
  fallback?: boolean
  mode?: string
  headerKind?: string
  rootByProp?: RendererRootByProp
  propMappings?: RendererPropMapping[]
}

export type RuntimeCapabilities = {
  uiCapabilities: {
    components: {
      name: string
      renderKind?: string
      slots?: RendererSlot[]
    }[]
  }
  rendererSpec: {
    version: number
    components: RendererSpecComponent[]
  }
}
