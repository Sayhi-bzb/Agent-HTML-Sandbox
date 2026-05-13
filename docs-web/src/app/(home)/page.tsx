import Link from "next/link"

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-20">
      <p className="mb-4 text-sm font-medium uppercase text-muted-foreground">
        AI-native HTML artifacts
      </p>
      <h1 className="mb-5 text-4xl font-semibold text-balance sm:text-5xl">
        Replace long Markdown with stable, shareable HTML.
      </h1>
      <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
        agent-html gives agents a semantic authoring format for plans, reports,
        PR explainers, decisions, and feedback loops. Agents write structure;
        ahtml renders a portable artifact people can actually read and share.
      </p>
      <div className="mt-8">
        <Link
          href="/docs"
          className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          Read the docs
        </Link>
      </div>
    </main>
  )
}
