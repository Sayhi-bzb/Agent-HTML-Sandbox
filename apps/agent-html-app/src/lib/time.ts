export function formatTimestampLabel(value?: string) {
  if (!value) {
    return "n/a"
  }

  const date = parseTimestamp(value)
  if (!date) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function getTimestampMillis(value?: string) {
  const date = value ? parseTimestamp(value) : undefined
  return date ? date.getTime() : undefined
}

function parseTimestamp(value: string) {
  const epochMatch = /^epoch-(\d+)$/.exec(value)
  if (epochMatch) {
    const millis = Number(epochMatch[1])
    if (Number.isFinite(millis)) {
      return new Date(millis)
    }
  }

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return undefined
  }

  return new Date(parsed)
}
