import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">agent-html</h1>
      <p className="text-muted-foreground">
        Local CLI engine for safe agent artifacts. Open{" "}
        <Link href="/docs" className="font-medium underline">
          the docs
        </Link>{" "}
        to initialize, build, and debug the workflow.
      </p>
    </div>
  )
}
