import { Tiktoken } from "js-tiktoken/lite"
import o200kBase from "js-tiktoken/ranks/o200k_base"

export type ComparisonEntry = {
  id: "markdown" | "html" | "agent-html"
  name: string
  sourceLabel: string
  source: string
  description: string
  authoringTokens: number
}

const tokenizer = new Tiktoken(o200kBase)

const benchmarkCopy = {
  summary:
    "Streaming reliability improved after the queue patch, but reviewers should re-check backpressure and retry reset before merge.",
  checklist: [
    "Check whether slow consumers can still block the producer.",
    "Confirm retry state resets after the first successful stream.",
    "Keep the review readable outside the Git diff view.",
  ],
  risk:
    "Retries now recover correctly, but slow-consumer behaviour still needs load testing.",
  evidence: [
    ["Backpressure path", "Covered in tests"],
    ["Retry reset", "Manual verification pending"],
  ] as const,
}

export type BenchmarkCopy = typeof benchmarkCopy

const markdownSource = [
  "# Queue Patch Review",
  "",
  "## Summary",
  benchmarkCopy.summary,
  "",
  "## Review focus",
  ...benchmarkCopy.checklist.map((item) => `- ${item}`),
  "",
  `> Risk note: ${benchmarkCopy.risk}`,
  "",
  "| Evidence | Status |",
  "| --- | --- |",
  ...benchmarkCopy.evidence.map(([label, value]) => `| ${label} | ${value} |`),
].join("\n")

const htmlSource = [
  '<section class="artifact-shell artifact-shell--review">',
  '  <header class="artifact-header">',
  '    <p class="eyebrow">Queue patch review</p>',
  '    <h1 class="artifact-title">Streaming review</h1>',
  `    <p class="artifact-summary">${benchmarkCopy.summary}</p>`,
  "  </header>",
  "",
  '  <section class="panel panel--focus">',
  '    <h2 class="panel-title">Review focus</h2>',
  '    <ul class="bullet-list">',
  ...benchmarkCopy.checklist.map(
    (item) => `      <li class="bullet-item">${item}</li>`,
  ),
  "    </ul>",
  "  </section>",
  "",
  '  <aside class="panel panel--alert" role="note">',
  '    <h2 class="panel-title">Risk note</h2>',
  `    <p class="panel-copy">${benchmarkCopy.risk}</p>`,
  "  </aside>",
  "",
  '  <table class="evidence-table">',
  "    <thead>",
  "      <tr><th>Evidence</th><th>Status</th></tr>",
  "    </thead>",
  "    <tbody>",
  ...benchmarkCopy.evidence.map(
    ([label, value]) =>
      `      <tr><td class="cell">${label}</td><td class="cell">${value}</td></tr>`,
  ),
  "    </tbody>",
  "  </table>",
  "</section>",
].join("\n")

const agentHtmlSource = [
  '<meta-agent profile="review-dense" />',
  "",
  '<page title="Queue Patch Review">',
  '  <card title="Summary">',
  `    ${benchmarkCopy.summary}`,
  "  </card>",
  "",
  '  <card title="Review Focus">',
  '    <list variant="unordered">',
  ...benchmarkCopy.checklist.map((item) => `      <item>${item}</item>`),
  "    </list>",
  "  </card>",
  "",
  '  <alert title="Risk Note" tone="neutral">',
  `    ${benchmarkCopy.risk}`,
  "  </alert>",
  "",
  "  <table>",
  '    <row kind="header">',
  "      <cell>Evidence</cell>",
  "      <cell>Status</cell>",
  "    </row>",
  ...benchmarkCopy.evidence.map(
    ([label, value]) => [
      '    <row kind="body">',
      `      <cell>${label}</cell>`,
      `      <cell>${value}</cell>`,
      "    </row>",
    ].join("\n"),
  ),
  "  </table>",
  "</page>",
].join("\n")

function countTokens(source: string) {
  return tokenizer.encode(source).length
}

export const comparisonEntries: ComparisonEntry[] = [
  {
    id: "markdown",
    name: "Markdown",
    sourceLabel: "md",
    source: markdownSource,
    description: "Fast to write. Limited delivery structure.",
    authoringTokens: countTokens(markdownSource),
  },
  {
    id: "html",
    name: "HTML",
    sourceLabel: "html",
    source: htmlSource,
    description: "Precise output. Noisy authoring surface.",
    authoringTokens: countTokens(htmlSource),
  },
  {
    id: "agent-html",
    name: "agent-html",
    sourceLabel: "agent.html",
    source: agentHtmlSource,
    description: "Semantic source. Stable artifact delivery.",
    authoringTokens: countTokens(agentHtmlSource),
  },
]

export const benchmarkCopyData = benchmarkCopy
