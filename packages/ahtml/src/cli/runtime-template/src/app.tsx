import React from "react"

import generatedDocument from "../document.generated.json"
import runtimeVerificationState from "../render-verification.generated.json"
import {
  assertRendererRegistryParity,
  createRendererSpecMap,
} from "./renderer/parity"
import { createRendererNode } from "./renderer/render-node"
import type { AgentComponentNode, AgentDocument } from "./renderer/types"
import type { RuntimeVerificationState } from "./renderer/types"

const agentDocument = generatedDocument as AgentDocument
const runtimeRendererVerification =
  runtimeVerificationState as RuntimeVerificationState
const rendererSpecByName = createRendererSpecMap(runtimeRendererVerification)
const RendererNode = createRendererNode(
  rendererSpecByName,
  agentDocument.meta.styleProfile.componentStyle.treatments,
)
const shellProjection = getStyleProfileLegacyProjection(agentDocument)
const documentStyleCss = createDocumentStyleCss(agentDocument)

assertRendererRegistryParity(runtimeRendererVerification, rendererSpecByName)

export function App() {
  const title = getDocumentTitle(agentDocument)
  const shellClassName = getShellClassName(agentDocument)

  React.useEffect(() => {
    if (title && typeof document !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      document.title = title
    }
  }, [title])

  return (
    <>
      <style>{documentStyleCss}</style>
      <main
        className={shellClassName}
        data-style-profile={agentDocument.meta.styleProfile.id}
        data-theme={shellProjection.theme}
        data-density={shellProjection.density}
        data-tone={shellProjection.tone}
        data-width={shellProjection.width}
      >
        {agentDocument.components.map((node, index) => (
          <RendererNode key={index} node={node} />
        ))}
      </main>
    </>
  )
}

function getShellClassName(agentDocument: AgentDocument) {
  const { density, tone, width } = getStyleProfileLegacyProjection(agentDocument)
  const widthClassName =
    width === "wide"
      ? "max-w-7xl"
      : width === "dashboard"
        ? "max-w-6xl"
        : "max-w-4xl"
  const densityClassName = density === "compact" ? "gap-4 py-8" : "gap-6 py-10"
  const toneClassName =
    tone === "dashboard"
      ? "items-stretch"
      : tone === "decision"
        ? "items-start"
        : "items-stretch"

  return [
    "mx-auto grid min-h-screen w-full px-4 sm:px-6",
    widthClassName,
    densityClassName,
    toneClassName,
  ].join(" ")
}

function getStyleProfileLegacyProjection(agentDocument: AgentDocument) {
  return agentDocument.meta.styleProfile.globalStyle.legacyProjection
}

function createDocumentStyleCss(agentDocument: AgentDocument) {
  const globalStyle = agentDocument.meta.styleProfile.globalStyle

  return [
    `:root{${createGlobalStyleDeclarations(globalStyle, "light")}}`,
    `@media (prefers-color-scheme: dark){:root{${createGlobalStyleDeclarations(
      globalStyle,
      "dark",
    )}}}`,
  ].join("")
}

function createGlobalStyleDeclarations(
  globalStyle: AgentDocument["meta"]["styleProfile"]["globalStyle"],
  mode: "light" | "dark",
) {
  return [
    `${globalStyle.cssVariableMap.background}:${globalStyle.tokenSets[mode].background};`,
    `${globalStyle.cssVariableMap.foreground}:${globalStyle.tokenSets[mode].foreground};`,
    `${globalStyle.cssVariableMap.card}:${globalStyle.tokenSets[mode].card};`,
    `${globalStyle.cssVariableMap.cardForeground}:${globalStyle.tokenSets[mode].cardForeground};`,
    `${globalStyle.cssVariableMap.popover}:${globalStyle.tokenSets[mode].popover};`,
    `${globalStyle.cssVariableMap.popoverForeground}:${globalStyle.tokenSets[mode].popoverForeground};`,
    `${globalStyle.cssVariableMap.primary}:${globalStyle.tokenSets[mode].primary};`,
    `${globalStyle.cssVariableMap.primaryForeground}:${globalStyle.tokenSets[mode].primaryForeground};`,
    `${globalStyle.cssVariableMap.secondary}:${globalStyle.tokenSets[mode].secondary};`,
    `${globalStyle.cssVariableMap.secondaryForeground}:${globalStyle.tokenSets[mode].secondaryForeground};`,
    `${globalStyle.cssVariableMap.muted}:${globalStyle.tokenSets[mode].muted};`,
    `${globalStyle.cssVariableMap.mutedForeground}:${globalStyle.tokenSets[mode].mutedForeground};`,
    `${globalStyle.cssVariableMap.accent}:${globalStyle.tokenSets[mode].accent};`,
    `${globalStyle.cssVariableMap.accentForeground}:${globalStyle.tokenSets[mode].accentForeground};`,
    `${globalStyle.cssVariableMap.destructive}:${globalStyle.tokenSets[mode].destructive};`,
    `${globalStyle.cssVariableMap.border}:${globalStyle.tokenSets[mode].border};`,
    `${globalStyle.cssVariableMap.input}:${globalStyle.tokenSets[mode].input};`,
    `${globalStyle.cssVariableMap.ring}:${globalStyle.tokenSets[mode].ring};`,
    `${globalStyle.cssVariableMap.radius}:${globalStyle.radiusScale.base};`,
    `${globalStyle.cssVariableMap.fontSans}:${globalStyle.typography.fontSans};`,
    `${globalStyle.cssVariableMap.fontHeading}:${globalStyle.typography.fontHeading};`,
    `color-scheme:${mode};`,
  ].join("")
}

function getDocumentTitle(agentDocument: AgentDocument) {
  const page = agentDocument.components.find(
    (node): node is AgentComponentNode =>
      node.type === "component" && node.name === "page",
  )

  return page?.props.title
}
