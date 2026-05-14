import { Tiktoken } from "js-tiktoken/lite"
import o200kBase from "js-tiktoken/ranks/o200k_base"
import { agentHtmlSource } from "./benchmark-agent-html"
import { benchmarkCopy } from "./benchmark-copy"
import { htmlSource } from "./benchmark-html"
import { markdownSource } from "./benchmark-markdown"

export type ComparisonEntry = {
  id: "markdown" | "html" | "agent-html"
  name: string
  sourceLabel: string
  source: string
  description: string
  authoringTokens: number
}

export type BenchmarkCopy = typeof benchmarkCopy

const tokenizer = new Tiktoken(o200kBase)

function countTokens(source: string) {
  return tokenizer.encode(source).length
}

export const comparisonEntries: ComparisonEntry[] = [
  {
    id: "markdown",
    name: "Markdown",
    sourceLabel: "md",
    source: markdownSource,
    description: "Linear note. Easy to write, weak at multi-view structure.",
    authoringTokens: countTokens(markdownSource),
  },
  {
    id: "html",
    name: "HTML",
    sourceLabel: "html",
    source: htmlSource,
    description:
      "Styled production UI. Tabs, panels, and accordion wiring make the source heavy fast.",
    authoringTokens: countTokens(htmlSource),
  },
  {
    id: "agent-html",
    name: "agent-html",
    sourceLabel: "agent.html",
    source: agentHtmlSource,
    description:
      "Semantic authoring. The structure stays compact even when the artifact becomes multi-view.",
    authoringTokens: countTokens(agentHtmlSource),
  },
]

export const benchmarkCopyData = benchmarkCopy
