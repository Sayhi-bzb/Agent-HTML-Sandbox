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
    documentStyleConfigReference: string
    styleProfile: {
      id: string
      globalStyle: {
        tokenSets: {
          light: {
            background: string
            foreground: string
            card: string
            cardForeground: string
            popover: string
            popoverForeground: string
            primary: string
            primaryForeground: string
            secondary: string
            secondaryForeground: string
            muted: string
            mutedForeground: string
            accent: string
            accentForeground: string
            destructive: string
            border: string
            input: string
            ring: string
          }
          dark: {
            background: string
            foreground: string
            card: string
            cardForeground: string
            popover: string
            popoverForeground: string
            primary: string
            primaryForeground: string
            secondary: string
            secondaryForeground: string
            muted: string
            mutedForeground: string
            accent: string
            accentForeground: string
            destructive: string
            border: string
            input: string
            ring: string
          }
        }
        radiusScale: {
          base: string
          sm: string
          md: string
          lg: string
          xl: string
          "2xl": string
          "3xl": string
          "4xl": string
        }
        typography: {
          fontSans: string
          fontHeading: string
        }
        cssVariableMap: {
          background: string
          foreground: string
          card: string
          cardForeground: string
          popover: string
          popoverForeground: string
          primary: string
          primaryForeground: string
          secondary: string
          secondaryForeground: string
          muted: string
          mutedForeground: string
          accent: string
          accentForeground: string
          destructive: string
          border: string
          input: string
          ring: string
          radius: string
          fontSans: string
          fontHeading: string
        }
      }
      componentStyle: {
        treatments: Record<string, string>
      }
    }
  }
  components: AgentNode[]
}

export type RendererSlot = {
  name: string
  children?: string[]
  childNames?: string[]
}

export type RendererPropValue = string | number | boolean | number[]

export type RendererPropMapping = {
  prop: string
  target: string
  map?: Record<string, RendererPropValue>
  default?: RendererPropValue
  coerce?: "boolean" | "number" | "number-array"
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
  requiredRegistryModules?: {
    registryItem: string
    exports: string[]
  }[]
  requiredRegistryItem?: string
  requiredExports?: string[]
  slots: RendererSlot[]
  childMode?: "block" | "inline" | "none"
  component?: string
  control?: string
  controlRoot?: string
  controlContent?: string
  controlEmpty?: string
  controlList?: string
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
  itemContainer?: string
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
  modeProp?: string
  defaultMode?: string
  headerKind?: string
  kindProp?: string
  itemValueProp?: string
  itemHeadingProp?: string
  valueProp?: string
  controlListAttr?: string
  emptyText?: string
  rootByProp?: RendererRootByProp
  propMappings?: RendererPropMapping[]
  staticProps?: Record<string, RendererPropValue>
}

export type RuntimeVerificationState = {
  verificationData: {
    components: {
      name: string
      renderKind?: string
      behavior?: {
        model: string
        runtimeOwner: string
        forwardedProps?: string[]
        visualStateProp?: string
        modeProp?: string
        defaultProp?: string
        defaultMode?: string
        multiValueDelimiter?: string
      }
      slots?: RendererSlot[]
    }[]
  }
  rendererMapping: {
    version: number
    components: RendererSpecComponent[]
  }
}
