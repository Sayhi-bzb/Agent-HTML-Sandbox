"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { ComparisonCard } from "./comparison-card"
import type { BenchmarkCopy, ComparisonEntry } from "./comparison-data"

type ComparisonCarouselProps = {
  entries: readonly ComparisonEntry[]
  benchmarkCopy: BenchmarkCopy
}

export function ComparisonCarousel({
  entries,
  benchmarkCopy,
}: ComparisonCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"raw" | "rendered">("raw")
  const activeEntry = entries[activeIndex] ?? entries[0]

  if (!activeEntry) {
    return null
  }

  const goPrev = () => {
    setActiveIndex((current) =>
      current === 0 ? entries.length - 1 : current - 1,
    )
  }

  const goNext = () => {
    setActiveIndex((current) =>
      current === entries.length - 1 ? 0 : current + 1,
    )
  }

  return (
    <section className="w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {entries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={
                index === activeIndex
                  ? "rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                  : "rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              }
            >
              {entry.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("raw")}
            className={
              viewMode === "raw"
                ? "rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                : "rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            }
          >
            Raw
          </button>
          <button
            type="button"
            onClick={() => setViewMode("rendered")}
            className={
              viewMode === "rendered"
                ? "rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                : "rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            }
          >
            Rendered
          </button>

          <div className="ml-1 flex items-center gap-2">
            <p className="text-sm font-medium uppercase text-muted-foreground">
              {activeIndex + 1} / {entries.length}
            </p>
            <IconButton label="Previous card" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton label="Next card" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ComparisonCard
          title={activeEntry.name}
          description={activeEntry.description}
          source={activeEntry.source}
          sourceLabel={activeEntry.sourceLabel}
          authoringTokens={activeEntry.authoringTokens}
          viewMode={viewMode}
        >
          {renderPreview(activeEntry.id, benchmarkCopy)}
        </ComparisonCard>
      </div>
    </section>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
    >
      {children}
    </button>
  )
}

function renderPreview(
  entryId: ComparisonEntry["id"],
  benchmarkCopy: BenchmarkCopy,
) {
  if (entryId === "markdown") {
    return (
      <div className="space-y-4 text-sm leading-7 text-foreground">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {benchmarkCopy.summaryStatus}
          </p>
          <h3 className="mt-2 text-xl font-semibold">{benchmarkCopy.title}</h3>
          <p className="mt-3 text-muted-foreground">
            {benchmarkCopy.subtitle}
          </p>
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

  if (entryId === "html") {
    return (
      <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-slate-900">
        <header className="rounded-lg border border-sky-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-700">
            {benchmarkCopy.summaryStatus}
          </p>
          <h3 className="mt-2 text-xl font-semibold">{benchmarkCopy.title}</h3>
          <p className="mt-3 text-slate-600">
            {benchmarkCopy.summary}
          </p>
        </header>

        <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-white p-2">
          {Object.values(benchmarkCopy.tabNames).map((name, index) => (
            <span
              key={name}
              className={
                index === 0
                  ? "rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-slate-500"
              }
            >
              {name}
            </span>
          ))}
        </div>

        <div className="grid gap-4">
          <section className="rounded-lg border border-sky-200 bg-white p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              Release checklist
            </h4>
            <ul className="mt-3 space-y-2 text-slate-700">
              {benchmarkCopy.checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Recommendation
            </h4>
            <p className="mt-3 text-slate-700">{benchmarkCopy.recommendation}</p>
          </aside>
        </div>

        <section className="rounded-lg border border-sky-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
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

        <div className="rounded-lg border border-sky-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
            Risks
          </h4>
          <div className="mt-3 space-y-3">
            {benchmarkCopy.risks.map((risk, index) => (
              <div
                key={risk.title}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{risk.title}</p>
                  <span className="text-xs text-slate-500">
                    {index === 0 ? "Expanded" : "Collapsed"}
                  </span>
                </div>
                {index === 0 ? (
                  <p className="mt-2 text-slate-600">{risk.body}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="pb-2 font-medium">Evidence</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {benchmarkCopy.evidence.map(([label, value]) => (
              <tr key={label} className="border-b border-slate-200 last:border-b-0">
                <td className="py-2 pr-3">{label}</td>
                <td className="py-2 text-slate-600">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-slate-900">
      <header className="rounded-lg border border-emerald-200 bg-white p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">
          {benchmarkCopy.summaryStatus}
        </p>
        <h3 className="mt-2 text-xl font-semibold">{benchmarkCopy.title}</h3>
        <p className="mt-3 text-slate-600">
          {benchmarkCopy.subtitle}
        </p>
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
            <tr key={label} className="border-b border-slate-200 last:border-b-0">
              <td className="py-2 pr-3">{label}</td>
              <td className="py-2 text-slate-600">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
