import { useMemo, useState } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { SanitizedNode, StandardAgentNode } from "../types"
import type { RendererComponent, RendererContext } from "./renderer-types"

export const INTERACTIVE_RENDERER_COMPONENTS = {
  tabs: {
    name: "tabs",
    render: (node, context) => <TabsBlock node={node} context={context} />,
  },
  tab: {
    name: "tab",
    render: () => null,
  },
  accordion: {
    name: "accordion",
    render: (node, context) => (
      <Accordion type="single" collapsible className="rounded-lg border px-3">
        {node.children
          .filter(isComponentNamed("accordion-item"))
          .map((item) => (
            <AccordionItem key={item.props.value} value={item.props.value}>
              <AccordionTrigger>{item.props.title}</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  {context.renderChildren(item.children)}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    ),
  },
  "accordion-item": {
    name: "accordion-item",
    render: () => null,
  },
  "choice-group": {
    name: "choice-group",
    render: (node, context) => <ChoiceGroup node={node} context={context} />,
  },
  choice: {
    name: "choice",
    render: () => null,
  },
  "slider-control": {
    name: "slider-control",
    render: (node) => <SliderControl node={node} />,
  },
  "feedback-box": {
    name: "feedback-box",
    render: (node) => <FeedbackBox node={node} />,
  },
  "progress-meter": {
    name: "progress-meter",
    render: (node) => <ProgressMeter node={node} />,
  },
} satisfies Record<string, RendererComponent>

function TabsBlock({
  node,
  context,
}: {
  readonly node: StandardAgentNode
  readonly context: RendererContext
}) {
  const tabs = node.children.filter(isComponentNamed("tab"))
  const firstValue = tabs[0]?.props.value ?? "tab"
  const defaultValue = node.props.default || firstValue

  return (
    <Tabs defaultValue={defaultValue} className="gap-4">
      <TabsList variant="line" className="flex-wrap">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.props.value} value={tab.props.value}>
            {tab.props.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.props.value}
          value={tab.props.value}
          className="flex flex-col gap-4"
        >
          {context.renderChildren(tab.children)}
        </TabsContent>
      ))}
    </Tabs>
  )
}

function ChoiceGroup({
  node,
  context,
}: {
  readonly node: StandardAgentNode
  readonly context: RendererContext
}) {
  const choices = node.children.filter(isComponentNamed("choice"))
  const mode = node.props.mode === "multiple" ? "multiple" : "single"
  const initialValue = node.props.default || choices[0]?.props.value || ""
  const [singleValue, setSingleValue] = useState(initialValue)
  const [multipleValues, setMultipleValues] = useState(() =>
    splitValues(node.props.default),
  )

  if (mode === "multiple") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        {node.props.title ? (
          <h3 className="text-sm font-medium">{node.props.title}</h3>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {choices.map((choice) => {
            const checked = multipleValues.includes(choice.props.value)

            return (
              <div
                key={choice.props.value}
                className="flex items-start gap-3 rounded-md border p-3 text-sm"
              >
                <Checkbox
                  aria-label={choice.props.label}
                  checked={checked}
                  onCheckedChange={(nextChecked) => {
                    setMultipleValues((current) =>
                      nextChecked
                        ? [...new Set([...current, choice.props.value])]
                        : current.filter(
                            (value) => value !== choice.props.value,
                          ),
                    )
                  }}
                />
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{choice.props.label}</span>
                  <span className="text-muted-foreground">
                    {context.renderChildren(choice.children)}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      {node.props.title ? (
        <h3 className="text-sm font-medium">{node.props.title}</h3>
      ) : null}
      <ToggleGroup
        type="single"
        value={singleValue}
        onValueChange={(value) => {
          if (value) {
            setSingleValue(value)
          }
        }}
        variant="outline"
        className="flex-wrap"
      >
        {choices.map((choice) => (
          <ToggleGroupItem key={choice.props.value} value={choice.props.value}>
            {choice.props.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-muted-foreground text-sm">
        Selected: {getChoiceLabel(choices, singleValue)}
      </p>
    </div>
  )
}

function SliderControl({ node }: { readonly node: StandardAgentNode }) {
  const min = parseFiniteNumber(node.props.min, 0)
  const max = parseFiniteNumber(node.props.max, 100)
  const step = parseFiniteNumber(node.props.step, 1)
  const initialValue = clampNumber(
    parseFiniteNumber(node.props.value, min),
    min,
    max,
  )
  const [value, setValue] = useState([initialValue])
  const currentValue = value[0] ?? initialValue

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">{node.props.label}</h3>
          <p className="text-muted-foreground text-sm">{getText(node)}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline">
                {currentValue}
                {node.props.unit ?? ""}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Current controlled value</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={setValue}
      />
    </div>
  )
}

function FeedbackBox({ node }: { readonly node: StandardAgentNode }) {
  const initialValue = useMemo(() => getText(node), [node])
  const [value, setValue] = useState(initialValue)
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      {node.props.title ? (
        <h3 className="text-sm font-medium">{node.props.title}</h3>
      ) : null}
      <Textarea
        value={value}
        placeholder={node.props.placeholder}
        onChange={(event) => {
          setValue(event.target.value)
          setCopied(false)
        }}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(value)
            setCopied(true)
          }}
        >
          {copied ? "Copied" : (node.props["copy-label"] ?? "Copy prompt")}
        </Button>
      </div>
    </div>
  )
}

function ProgressMeter({ node }: { readonly node: StandardAgentNode }) {
  const value = clampNumber(parseFiniteNumber(node.props.value, 0), 0, 100)

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{node.props.label}</span>
        <Badge variant="secondary">{value}%</Badge>
      </div>
      <Progress value={value} />
      {node.props.detail ? (
        <p className="text-muted-foreground text-sm">{node.props.detail}</p>
      ) : null}
    </div>
  )
}

function getText(node: StandardAgentNode): string {
  return node.children
    .filter(
      (child): child is { readonly type: "text"; readonly value: string } =>
        child.type === "text",
    )
    .map((child) => child.value)
    .join("")
    .trim()
}

function splitValues(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

function getChoiceLabel(
  choices: readonly StandardAgentNode[],
  value: string,
): string {
  return (
    choices.find((choice) => choice.props.value === value)?.props.label ?? value
  )
}

function parseFiniteNumber(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isComponentNamed(name: string) {
  return (node: SanitizedNode): node is StandardAgentNode =>
    node.type === "component" && node.name === name
}
