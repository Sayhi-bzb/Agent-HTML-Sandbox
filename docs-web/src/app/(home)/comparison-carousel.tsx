"use client"

import { useState } from "react"
import { CompareSourceCard, SingleSourceCard } from "./comparison-card"
import { CodeComparison } from "./code-comparison"
import type { BenchmarkCopy, ComparisonEntry } from "./comparison-data"

type ComparisonCarouselProps = {
  entries: readonly ComparisonEntry[]
  benchmarkCopy: BenchmarkCopy
}

type ComparisonMode = "markdown" | "source-compare"

export function ComparisonCarousel({
  entries,
  benchmarkCopy,
}: ComparisonCarouselProps) {
  const markdownEntry = entries.find((entry) => entry.id === "markdown")
  const htmlEntry = entries.find((entry) => entry.id === "html")
  const agentHtmlEntry = entries.find((entry) => entry.id === "agent-html")
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>("source-compare")
  const [viewMode, setViewMode] = useState<"raw" | "rendered">("raw")
  const toggleGroupClass =
    "inline-flex w-fit flex-wrap items-center gap-1 rounded-full border border-border/70 bg-muted/45 p-1 shadow-sm"
  const activeToggleClass =
    "rounded-full bg-foreground px-3.5 py-1.5 text-sm font-semibold text-background shadow-sm shadow-black/10 ring-1 ring-black/5 underline-offset-4 transition duration-150 hover:underline"
  const inactiveToggleClass =
    "rounded-full px-3.5 py-1.5 text-sm font-semibold text-muted-foreground underline-offset-4 transition duration-150 hover:bg-background/80 hover:text-foreground hover:underline"

  if (!markdownEntry || !htmlEntry || !agentHtmlEntry) {
    return null
  }

  return (
    <section className="w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className={toggleGroupClass}>
          <button
            type="button"
            aria-pressed={comparisonMode === "markdown"}
            onClick={() => setComparisonMode("markdown")}
            className={
              comparisonMode === "markdown"
                ? activeToggleClass
                : inactiveToggleClass
            }
          >
            Markdown
          </button>
          <button
            type="button"
            aria-pressed={comparisonMode === "source-compare"}
            onClick={() => setComparisonMode("source-compare")}
            className={
              comparisonMode === "source-compare"
                ? activeToggleClass
                : inactiveToggleClass
            }
          >
            HTML vs agent-html
          </button>
        </div>

        <div className={toggleGroupClass}>
          <button
            type="button"
            aria-pressed={viewMode === "raw"}
            onClick={() => setViewMode("raw")}
            className={
              viewMode === "raw" ? activeToggleClass : inactiveToggleClass
            }
          >
            Raw
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "rendered"}
            onClick={() => setViewMode("rendered")}
            className={
              viewMode === "rendered"
                ? activeToggleClass
                : inactiveToggleClass
            }
          >
            Rendered
          </button>
        </div>
      </div>

      <div className="mt-6">
        {comparisonMode === "markdown" ? (
          <SingleSourceCard
            title={markdownEntry.name}
            description={markdownEntry.description}
            source={markdownEntry.source}
            sourceLabel={markdownEntry.sourceLabel}
            authoringTokens={markdownEntry.authoringTokens}
            viewMode={viewMode}
          >
            {renderMarkdownPreview(benchmarkCopy)}
          </SingleSourceCard>
        ) : (
          <CompareSourceCard
            title="HTML vs agent-html"
            description="Raw mode compares source complexity directly. Rendered mode focuses on the final agent-html artifact."
            viewMode={viewMode}
          >
            {viewMode === "raw" ? (
              <CodeComparison
                beforeCode={htmlEntry.source}
                afterCode={agentHtmlEntry.source}
                language="html"
                lightTheme="github-light"
                darkTheme="github-dark"
                beforeLabel="HTML"
                afterLabel="Agent-HTML"
                beforeTokens={htmlEntry.authoringTokens}
                afterTokens={agentHtmlEntry.authoringTokens}
              />
            ) : (
              renderAgentHtmlPreview(benchmarkCopy)
            )}
          </CompareSourceCard>
        )}
      </div>
    </section>
  )
}

function renderMarkdownPreview(benchmarkCopy: BenchmarkCopy) {
  return (
    <div className="space-y-4 text-sm leading-7 text-foreground">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {benchmarkCopy.summaryStatus}
        </p>
        <h3 className="mt-2 text-xl font-semibold">{benchmarkCopy.title}</h3>
        <p className="mt-3 text-muted-foreground">{benchmarkCopy.subtitle}</p>
      </header>

      <section>
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Summary
        </h4>
        <p className="mt-3 text-muted-foreground">{benchmarkCopy.summary}</p>
      </section>

      <section>
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Release checklist
        </h4>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {benchmarkCopy.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Rollout steps
        </h4>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {benchmarkCopy.rolloutSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section>
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Risks
        </h4>
        <div className="mt-3 space-y-3">
          {benchmarkCopy.risks.map((risk) => (
            <div key={risk.title}>
              <p className="font-medium text-foreground">{risk.title}</p>
              <p className="text-muted-foreground">{risk.body}</p>
            </div>
          ))}
        </div>
      </section>

      <blockquote className="border-l-2 border-border pl-4 text-muted-foreground">
        {benchmarkCopy.recommendation}
      </blockquote>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 font-medium">Evidence</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {benchmarkCopy.evidence.map(([label, value]) => (
            <tr key={label} className="border-b last:border-b-0">
              <td className="py-2 pr-3">{label}</td>
              <td className="py-2 text-muted-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderAgentHtmlPreview(benchmarkCopy: BenchmarkCopy) {
  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-slate-900">
      <header className="rounded-lg border border-emerald-200 bg-white p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">
          {benchmarkCopy.summaryStatus}
        </p>
        <h3 className="mt-2 text-xl font-semibold">{benchmarkCopy.title}</h3>
        <p className="mt-3 text-slate-600">{benchmarkCopy.subtitle}</p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Summary
        </h4>
        <p className="mt-3 text-slate-700">{benchmarkCopy.summary}</p>
      </section>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
        {Object.values(benchmarkCopy.tabNames).map((name, index) => (
          <span
            key={name}
            className={
              index === 0
                ? "rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-slate-500"
            }
          >
            {name}
          </span>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Release checklist
        </h4>
        <ul className="mt-3 space-y-2 text-slate-700">
          {benchmarkCopy.checklist.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Rollout steps
        </h4>
        <ol className="mt-3 space-y-2 text-slate-700">
          {benchmarkCopy.rolloutSteps.map((item) => (
            <li key={item} className="ml-5 list-decimal">
              {item}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          Recommendation
        </h4>
        <p className="mt-3 text-slate-700">{benchmarkCopy.recommendation}</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Risks
        </h4>
        <div className="mt-3 space-y-3">
          {benchmarkCopy.risks.map((risk, index) => (
            <div
              key={risk.title}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p className="font-medium text-slate-900">{risk.title}</p>
              {index === 0 ? (
                <p className="mt-2 text-slate-600">{risk.body}</p>
              ) : (
                <p className="mt-2 text-slate-400">Collapsed in this view</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-slate-500">
            <th className="pb-2 font-medium">Evidence</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {benchmarkCopy.evidence.map(([label, value]) => (
            <tr
              key={label}
              className="border-b border-slate-200 last:border-b-0"
            >
              <td className="py-2 pr-3">{label}</td>
              <td className="py-2 text-slate-600">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
