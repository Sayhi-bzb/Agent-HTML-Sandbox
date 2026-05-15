import type { AgentShellMessage } from "./types"

export type SourceComparisonSummary = {
  savedLineCount: number
  draftLineCount: number
  changedLineCount: number
  firstChangedLine?: number
  hasAdditionalChanges: boolean
  previewGroups: Array<{
    startLine: number
    endLine: number
    savedText: string
    draftText: string
  }>
  previewItems: Array<{
    lineNumber: number
    savedText: string
    draftText: string
  }>
}

export function getLatestProposalComparisonSummary(
  messages: AgentShellMessage[],
  currentSource: string,
) {
  const latestProposal = [...messages]
    .reverse()
    .find((message) => message.kind === "proposal-placeholder" && message.proposalSnapshot?.source)

  if (!latestProposal?.proposalSnapshot?.source) {
    return undefined
  }

  return getSourceComparisonSummary(latestProposal.proposalSnapshot.source, currentSource)
}

export function getSourceComparisonSummary(baseSource: string, nextSource: string) {
  if (baseSource === nextSource) {
    return undefined
  }

  const maxPreviewItems = 12
  const savedLines = baseSource.split(/\r?\n/)
  const draftLines = nextSource.split(/\r?\n/)
  const maxLength = Math.max(savedLines.length, draftLines.length)
  let changedLineCount = 0
  let firstChangedLine: number | undefined
  const previewItems: SourceComparisonSummary["previewItems"] = []
  const previewGroups: SourceComparisonSummary["previewGroups"] = []

  for (let index = 0; index < maxLength; index += 1) {
    if (savedLines[index] === draftLines[index]) {
      continue
    }

    changedLineCount += 1
    if (firstChangedLine === undefined) {
      firstChangedLine = index + 1
    }
    if (previewItems.length < maxPreviewItems) {
      const nextItem = {
        lineNumber: index + 1,
        savedText: trimDiffPreview(savedLines[index] ?? ""),
        draftText: trimDiffPreview(draftLines[index] ?? ""),
      }
      previewItems.push(nextItem)
      appendPreviewGroup(previewGroups, nextItem)
    }
  }

  return {
    savedLineCount: savedLines.length,
    draftLineCount: draftLines.length,
    changedLineCount,
    firstChangedLine,
    hasAdditionalChanges: changedLineCount > previewItems.length,
    previewGroups,
    previewItems,
  }
}

function trimDiffPreview(value: string) {
  const trimmed = value.trim()
  if (trimmed.length <= 140) {
    return trimmed
  }

  return `${trimmed.slice(0, 137)}...`
}

function appendPreviewGroup(
  previewGroups: SourceComparisonSummary["previewGroups"],
  nextItem: SourceComparisonSummary["previewItems"][number],
) {
  const lastGroup = previewGroups.at(-1)
  if (!lastGroup || nextItem.lineNumber !== lastGroup.endLine + 1) {
    previewGroups.push({
      startLine: nextItem.lineNumber,
      endLine: nextItem.lineNumber,
      savedText: nextItem.savedText,
      draftText: nextItem.draftText,
    })
    return
  }

  lastGroup.endLine = nextItem.lineNumber
  lastGroup.savedText = `${lastGroup.savedText}\n${nextItem.savedText}`
  lastGroup.draftText = `${lastGroup.draftText}\n${nextItem.draftText}`
}
