import type { DiagnosticItem } from "./types"

export function hydrateDiagnosticPositions(
  diagnostics: readonly DiagnosticItem[],
  source: string,
): DiagnosticItem[] {
  return diagnostics.map((diagnostic) => {
    if (typeof diagnostic.line === "number") {
      return diagnostic
    }

    const position = inferDiagnosticPosition(diagnostic, source)
    if (!position) {
      return diagnostic
    }

    return {
      ...diagnostic,
      line: position.line,
      column: position.column,
    }
  })
}

function inferDiagnosticPosition(diagnostic: DiagnosticItem, source: string) {
  switch (diagnostic.code) {
    case "missing-root":
    case "multiple-roots":
      return findFirstNonEmptyPosition(source)
    case "invalid-render-config":
    case "duplicate-meta-agent":
      return findNthTokenPosition(source, "<meta-agent", diagnostic.code === "duplicate-meta-agent" ? 2 : 1)
    case "unknown-attr": {
      const attrMatch = diagnostic.message.match(/"([^"]+)"/)
      return attrMatch
        ? findTokenPosition(source, `${attrMatch[1]}=`)
        : findFirstNonEmptyPosition(source)
    }
    case "unknown-component":
    case "invalid-child": {
      const componentMatch = diagnostic.message.match(/<([a-z-]+)>/)
      return componentMatch
        ? findTokenPosition(source, `<${componentMatch[1]}`)
        : findFirstNonEmptyPosition(source)
    }
    case "missing-required-attr": {
      const componentMatch = diagnostic.message.match(/^<([a-z-]+)>/)
      return componentMatch
        ? findTokenPosition(source, `<${componentMatch[1]}`)
        : findFirstNonEmptyPosition(source)
    }
    default:
      return findFirstNonEmptyPosition(source)
  }
}

function findNthTokenPosition(source: string, token: string, occurrence: number) {
  let index = -1
  let fromIndex = 0

  for (let count = 0; count < occurrence; count += 1) {
    index = source.indexOf(token, fromIndex)
    if (index < 0) {
      return undefined
    }
    fromIndex = index + token.length
  }

  return index >= 0 ? getLineColumnAt(source, index) : undefined
}

function findTokenPosition(source: string, token: string) {
  const index = source.indexOf(token)
  if (index < 0) {
    return undefined
  }

  return getLineColumnAt(source, index)
}

function findFirstNonEmptyPosition(source: string) {
  const match = source.match(/\S/)
  if (!match || match.index === undefined) {
    return { line: 1, column: 1 }
  }

  return getLineColumnAt(source, match.index)
}

function getLineColumnAt(source: string, index: number) {
  const before = source.slice(0, index)
  const lines = before.split(/\r?\n/)
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  }
}
