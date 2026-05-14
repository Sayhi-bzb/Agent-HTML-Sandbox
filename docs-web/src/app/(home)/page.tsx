import Link from "next/link"
import { ComparisonCarousel } from "./comparison-carousel"
import { benchmarkCopyData, comparisonEntries } from "./comparison-data"
import { SkillInstallCommand } from "./skill-install-command"

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-20">
      <section className="max-w-3xl">
        <p className="mb-4 text-sm font-medium uppercase text-muted-foreground">
          AI-native HTML artifacts
        </p>
        <h1 className="mb-5 text-4xl font-semibold text-balance sm:text-5xl">
          Replace long Markdown with stable, shareable HTML.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
          Compare the same code review written as Markdown, raw HTML, and
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">
            .agent.html
          </code>
          . One card at a time keeps the comparison readable while still showing
          both the source and the rendered result.
        </p>
        <SkillInstallCommand />
        <div className="mt-8">
          <Link
            href="/docs"
            className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Read the docs
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <ComparisonCarousel
          entries={comparisonEntries}
          benchmarkCopy={benchmarkCopyData}
        />
      </section>
    </main>
  )
}
